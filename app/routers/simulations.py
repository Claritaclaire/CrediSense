from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.database import get_db
from app.models.message_ia import MessageIA
from app.models.offre_credit import OffreCredit
from app.models.simulation import Simulation
from app.models.user import User, RoleUtilisateur
from app.schemas.simulation import SimulationCreate, SimulationOut, ComparaisonRequest, CapaciteRequest
from app.services.calculs_financiers import (
    calculer_capacite_offre,
    calculer_quotite_cessible_legale,
    simuler_credit,
)
from app.core.security import get_current_user, exiger_role
from app.core.exceptions import (
    OffreNonTrouveeException,
    MontantHorsLimitesException,
    DureeHorsLimitesException,
    SimulationNonTrouveeException,
)

router = APIRouter(prefix="/simulations", tags=["Simulations"])


def _construire_simulation_out(simulation: Simulation, offre: OffreCredit,
                                tableau_amortissement: list[dict] | None = None) -> SimulationOut:
    simulation_out = SimulationOut.model_validate(simulation)
    simulation_out.offre_id = offre.id
    simulation_out.nom_banque = offre.nom_banque
    simulation_out.tableau_amortissement = tableau_amortissement
    return simulation_out


def _executer_simulation(offre: OffreCredit, montant: float, duree_mois: int) -> dict:
    if montant > offre.montant_max:
        raise MontantHorsLimitesException(offre.montant_max)
    if not (offre.duree_min_mois <= duree_mois <= offre.duree_max_mois):
        raise DureeHorsLimitesException(offre.duree_min_mois, offre.duree_max_mois)

    frais_dossier_min = 5000.0 if "scolaire" in offre.nom_banque.lower() else 0.0

    return simuler_credit(
        capital=montant,
        taux_annuel=offre.taux_annuel,
        duree_mois=duree_mois,
        frais_dossier_pct=offre.frais_dossier_pct,
        assurance_pct_an=offre.assurance_pct_an,
        frais_dossier_min=frais_dossier_min,
    )


@router.post("/", response_model=SimulationOut)
def creer_simulation(
    data: SimulationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offre = db.query(OffreCredit).filter(OffreCredit.id == data.offre_id).first()
    if not offre:
        raise OffreNonTrouveeException()

    resultat = _executer_simulation(offre, data.montant, data.duree_mois)

    simulation = Simulation(
        user_id=current_user.id,
        offre_id=offre.id,
        montant=data.montant,
        duree_mois=data.duree_mois,
        mensualite=resultat["mensualite"],
        taeg=resultat["taeg"],
        cout_total=resultat["cout_total"],
    )
    db.add(simulation)
    db.commit()
    db.refresh(simulation)

    return _construire_simulation_out(
        simulation,
        offre,
        resultat["tableau_amortissement"],
    )


@router.post("/comparer")
def comparer_offres(
    data: ComparaisonRequest,
    db: Session = Depends(get_db),
):
    resultats = []
    for offre_id in data.offre_ids:
        offre = db.query(OffreCredit).filter(OffreCredit.id == offre_id).first()
        if not offre:
            continue
        resultat = _executer_simulation(offre, data.montant, data.duree_mois)
        resultats.append({
            "offre_id": str(offre.id),
            "nom_banque": offre.nom_banque,
            "mensualite": resultat["mensualite"],
            "assurance_mensuelle": resultat["assurance_mensuelle"],
            "taeg": resultat["taeg"],
            "cout_total": resultat["cout_total"],
        })

    # Tri par TAEG croissant (le vrai critère de comparaison, pas le taux nominal)
    resultats.sort(key=lambda r: r["taeg"])
    return resultats


def _indicateurs_offre_duree(
    offre: OffreCredit, duree: int, montant_souhaite: float,
    mensualite_max_avec_prets: float, mensualite_max_sans_prets: float,
) -> dict | None:
    """Calcule les indicateurs (mensualité demandée, capacité max...) d'UNE offre pour
    UNE durée donnée. Renvoie None si la durée est hors des bornes de cette offre."""
    if not (offre.duree_min_mois <= duree <= offre.duree_max_mois):
        return None

    frais_dossier_min = 5000.0 if "scolaire" in offre.nom_banque.lower() else 0.0
    capacite_avec_prets = calculer_capacite_offre(
        mensualite_max=max(0.0, mensualite_max_avec_prets),
        taux_annuel=offre.taux_annuel, duree_mois=duree,
        frais_dossier_pct=offre.frais_dossier_pct, assurance_pct_an=offre.assurance_pct_an,
        montant_max=offre.montant_max, frais_dossier_min=frais_dossier_min,
    )
    capacite_sans_prets = calculer_capacite_offre(
        mensualite_max=max(0.0, mensualite_max_sans_prets),
        taux_annuel=offre.taux_annuel, duree_mois=duree,
        frais_dossier_pct=offre.frais_dossier_pct, assurance_pct_an=offre.assurance_pct_an,
        montant_max=offre.montant_max, frais_dossier_min=frais_dossier_min,
    )
    simulation_demandee = None
    if montant_souhaite <= offre.montant_max:
        try:
            simulation_demandee = _executer_simulation(offre, montant_souhaite, duree)
        except Exception:
            simulation_demandee = None

    return {
        "duree_mois": duree,
        "mensualite_demande": (
            round(simulation_demandee["mensualite"] + simulation_demandee["assurance_mensuelle"], 2)
            if simulation_demandee else None
        ),
        "cout_total_demande": (
            round(simulation_demandee["cout_total"], 2) if simulation_demandee else None
        ),
        "montant_dans_capacite_avec_prets": capacite_avec_prets["montant_max_indicatif"],
        "montant_dans_capacite_sans_prets": capacite_sans_prets["montant_max_indicatif"],
        "tableau_amortissement": simulation_demandee["tableau_amortissement"] if simulation_demandee else [],
    }


def _meilleures_lignes_par_duree(
    offres: list, durees: list, montant_souhaite: float,
    mensualite_max_avec_prets: float, mensualite_max_sans_prets: float,
) -> dict:
    """Pour chaque durée testée, retient l'offre donnant la plus forte capacité
    d'emprunt (et, a defaut, la mensualite la plus basse pour le montant demande)."""
    resultats_par_duree: dict[int, dict] = {}
    for offre in offres:
        for duree in durees:
            ligne = _indicateurs_offre_duree(
                offre, duree, montant_souhaite, mensualite_max_avec_prets, mensualite_max_sans_prets
            )
            if ligne is None:
                continue

            existant = resultats_par_duree.get(duree)
            if not existant:
                resultats_par_duree[duree] = ligne
                continue

            existant["montant_dans_capacite_avec_prets"] = max(
                existant["montant_dans_capacite_avec_prets"], ligne["montant_dans_capacite_avec_prets"]
            )
            existant["montant_dans_capacite_sans_prets"] = max(
                existant["montant_dans_capacite_sans_prets"], ligne["montant_dans_capacite_sans_prets"]
            )
            if ligne["mensualite_demande"] is not None:
                if existant["mensualite_demande"] is None or ligne["mensualite_demande"] < existant["mensualite_demande"]:
                    existant["mensualite_demande"] = ligne["mensualite_demande"]
                    existant["cout_total_demande"] = ligne["cout_total_demande"]
                    existant["tableau_amortissement"] = ligne["tableau_amortissement"]
    return resultats_par_duree


@router.post("/capacite")
def calculer_capacite(
    data: CapaciteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Calcule la capacité d'emprunt directement sur la base de la Quotité Cessible Légale (Décret n°94/197/PM)."""
    if data.revenu_mensuel <= 0 or data.montant_souhaite <= 0:
        raise HTTPException(status_code=422, detail="Le revenu et le montant souhaité doivent être supérieurs à zéro.")
    if data.charges_mensuelles < 0 or data.total_mensualites_prets_en_cours < 0:
        raise HTTPException(status_code=422, detail="Les charges ne peuvent pas être négatives.")

    # Calcul direct selon la Quotité Cessible Légale (Décret n°94/197/PM)
    quotite_legale = calculer_quotite_cessible_legale(data.revenu_mensuel)
    quotite_totale = quotite_legale["quotite_cessible_totale"]

    mensualite_max_sans_prets = quotite_totale - data.charges_mensuelles
    mensualite_max_avec_prets = mensualite_max_sans_prets - data.total_mensualites_prets_en_cours

    offres = db.query(OffreCredit).filter(OffreCredit.actif.is_(True)).all()

    # Jalon de durées standards à évaluer (en mois)
    jalons_durees = [3, 6, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120]

    # Union des durées a tester : les jalons qui tombent dans la plage de chaque offre,
    # plus un repli tous les 12 mois pour les offres dont la plage ne croise aucun jalon
    # (ex. une offre limitee a 1 mois).
    durees_a_tester = set()
    for offre in offres:
        applicables = [d for d in jalons_durees if offre.duree_min_mois <= d <= offre.duree_max_mois]
        if not applicables:
            applicables = list(range(offre.duree_min_mois, offre.duree_max_mois + 1, 12))
        durees_a_tester.update(applicables)

    resultats_par_duree = _meilleures_lignes_par_duree(
        offres, sorted(durees_a_tester), data.montant_souhaite, mensualite_max_avec_prets, mensualite_max_sans_prets
    )

    resultats = sorted(resultats_par_duree.values(), key=lambda ligne: ligne["duree_mois"])

    # Évaluation de la faisabilité pour chaque durée
    capacite_disponible = max(0.0, mensualite_max_avec_prets)

    def _est_faisable(ligne: dict) -> bool:
        mensualite = ligne.get("mensualite_demande")
        return (
            mensualite is not None
            and mensualite <= capacite_disponible
            and ligne["montant_dans_capacite_avec_prets"] >= data.montant_souhaite
        )

    for ligne in resultats:
        ligne["faisable"] = _est_faisable(ligne)

    # Recherche de la première durée (minimale) où le prêt est réalisable, parmi les jalons
    premiere_duree_faisable = next((l for l in resultats if l["faisable"]), None)

    if premiere_duree_faisable:
        duree_min_faisable = premiere_duree_faisable["duree_mois"]
        mensualite_duree_min = premiere_duree_faisable["mensualite_demande"]
        cout_total_duree_min = premiere_duree_faisable["cout_total_demande"]
        demande_faisable = True

        # Affinage mois par mois : les jalons sont espacés (ex. 18 puis 24 mois), donc la
        # duree minimale reelle peut etre plus courte que le premier jalon realisable.
        # On recherche entre le jalon precedent (non realisable) et celui-ci.
        index_jalon = jalons_durees.index(duree_min_faisable) if duree_min_faisable in jalons_durees else None
        duree_jalon_precedent = jalons_durees[index_jalon - 1] if index_jalon else 0
        durees_a_affiner = list(range(duree_jalon_precedent + 1, duree_min_faisable))

        if durees_a_affiner:
            lignes_affinees = _meilleures_lignes_par_duree(
                offres, durees_a_affiner, data.montant_souhaite,
                mensualite_max_avec_prets, mensualite_max_sans_prets,
            )
            for ligne in lignes_affinees.values():
                ligne["faisable"] = _est_faisable(ligne)

            premiere_duree_affinee = next(
                (lignes_affinees[d] for d in sorted(lignes_affinees) if lignes_affinees[d]["faisable"]),
                None,
            )
            if premiere_duree_affinee:
                duree_min_faisable = premiere_duree_affinee["duree_mois"]
                mensualite_duree_min = premiere_duree_affinee["mensualite_demande"]
                cout_total_duree_min = premiere_duree_affinee["cout_total_demande"]
                # On insere cette duree affinee dans le tableau affiche, pour que
                # l'utilisateur voie exactement pourquoi c'est le bon minimum.
                resultats_par_duree[duree_min_faisable] = premiere_duree_affinee
                resultats = sorted(resultats_par_duree.values(), key=lambda ligne: ligne["duree_mois"])
    else:
        duree_min_faisable = None
        mensualite_duree_min = None
        cout_total_duree_min = None
        demande_faisable = False

    return {
        "revenu_mensuel": data.revenu_mensuel,
        "montant_souhaite": data.montant_souhaite,
        "charges_mensuelles": data.charges_mensuelles,
        "total_mensualites_prets_en_cours": data.total_mensualites_prets_en_cours,
        "seuil_endettement": quotite_legale["taux_effectif_pct"],
        "mensualite_max_avec_prets": round(max(0.0, mensualite_max_avec_prets), 2),
        "mensualite_max_sans_prets": round(max(0.0, mensualite_max_sans_prets), 2),
        "depassement_avec_prets": mensualite_max_avec_prets <= 0,
        "depassement_sans_prets": mensualite_max_sans_prets <= 0,
        "quotite_legale": quotite_legale,
        "demande_faisable": demande_faisable,
        "duree_min_faisable": duree_min_faisable,
        "mensualite_duree_min": mensualite_duree_min,
        "cout_total_duree_min": cout_total_duree_min,
        "durees": resultats,
    }


@router.get("/historique", response_model=list[SimulationOut])
def historique(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    simulations = (
        db.query(Simulation)
        .filter(Simulation.user_id == current_user.id)
        .order_by(Simulation.date_creation.desc())
        .all()
    )
    resultats = []
    for simulation in simulations:
        offre = db.query(OffreCredit).filter(OffreCredit.id == simulation.offre_id).first()
        if offre:
            resultats.append(_construire_simulation_out(simulation, offre))
    return resultats


# Nouveaux endpoints pour conseillers et admins
@router.get("/all", response_model=list[SimulationOut], dependencies=[Depends(exiger_role(RoleUtilisateur.conseiller, RoleUtilisateur.admin))])
def lister_toutes_simulations(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    """Endpoint reserve aux conseillers et admins pour voir toutes les simulations"""
    simulations = db.query(Simulation).offset(skip).limit(limit).all()
    resultats = []
    for simulation in simulations:
        offre = db.query(OffreCredit).filter(OffreCredit.id == simulation.offre_id).first()
        if offre:
            resultats.append(_construire_simulation_out(simulation, offre))
    return resultats


@router.get("/{simulation_id}", response_model=SimulationOut)
def obtenir_simulation(
    simulation_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    simulation = (
        db.query(Simulation)
        .filter(Simulation.id == simulation_id, Simulation.user_id == current_user.id)
        .first()
    )
    if not simulation:
        raise SimulationNonTrouveeException()

    offre = db.query(OffreCredit).filter(OffreCredit.id == simulation.offre_id).first()
    if not offre:
        raise OffreNonTrouveeException()

    resultat = simuler_credit(
        capital=simulation.montant,
        taux_annuel=offre.taux_annuel,
        duree_mois=simulation.duree_mois,
        frais_dossier_pct=offre.frais_dossier_pct,
        assurance_pct_an=offre.assurance_pct_an,
    )
    return _construire_simulation_out(simulation, offre, resultat["tableau_amortissement"])


@router.delete("/{simulation_id}", status_code=204)
def supprimer_simulation(
    simulation_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Supprime une simulation appartenant à l'utilisateur connecté."""
    simulation = (
        db.query(Simulation)
        .filter(Simulation.id == simulation_id, Simulation.user_id == current_user.id)
        .first()
    )
    if not simulation:
        raise SimulationNonTrouveeException()

    db.query(MessageIA).filter(MessageIA.simulation_id == simulation.id).delete()
    db.delete(simulation)
    db.commit()
    return None


