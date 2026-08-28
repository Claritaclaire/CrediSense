from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.offre_credit import OffreCredit
from app.models.simulation import Simulation
from app.models.user import User, RoleUtilisateur
from app.schemas.simulation import SimulationCreate, SimulationOut, ComparaisonRequest, CapaciteRequest
from app.services.calculs_financiers import calculer_capacite_offre, simuler_credit
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
            "taeg": resultat["taeg"],
            "cout_total": resultat["cout_total"],
        })

    # Tri par TAEG croissant (le vrai critère de comparaison, pas le taux nominal)
    resultats.sort(key=lambda r: r["taeg"])
    return resultats


@router.post("/capacite")
def calculer_capacite(
    data: CapaciteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Calcule une capacite indicative pour chaque offre active."""
    if data.revenu_mensuel <= 0 or data.montant_souhaite <= 0:
        raise HTTPException(status_code=422, detail="Le revenu et le montant souhaité doivent être supérieurs à zéro.")
    if data.charges_mensuelles < 0 or data.total_mensualites_prets_en_cours < 0:
        raise HTTPException(status_code=422, detail="Les charges ne peuvent pas être négatives.")
    if not 0 < data.seuil_endettement <= 100:
        raise HTTPException(status_code=422, detail="Le seuil d'endettement doit être compris entre 0 et 100.")

    mensualite_max_sans_prets = (
        data.revenu_mensuel * data.seuil_endettement / 100
        - data.charges_mensuelles
    )
    mensualite_max_avec_prets = mensualite_max_sans_prets - data.total_mensualites_prets_en_cours
    offres = db.query(OffreCredit).filter(OffreCredit.actif.is_(True)).all()
    resultats = []
    for offre in offres:
        frais_dossier_min = 5000.0 if "scolaire" in offre.nom_banque.lower() else 0.0
        durees = range(
            ((offre.duree_min_mois + 11) // 12) * 12,
            offre.duree_max_mois + 1,
            12,
        )
        for duree in durees:
            capacite_avec_prets = calculer_capacite_offre(
                mensualite_max=mensualite_max_avec_prets,
                taux_annuel=offre.taux_annuel, duree_mois=duree,
                frais_dossier_pct=offre.frais_dossier_pct, assurance_pct_an=offre.assurance_pct_an,
                montant_max=offre.montant_max, frais_dossier_min=frais_dossier_min,
            )
            capacite_sans_prets = calculer_capacite_offre(
                mensualite_max=mensualite_max_sans_prets,
                taux_annuel=offre.taux_annuel, duree_mois=duree,
                frais_dossier_pct=offre.frais_dossier_pct, assurance_pct_an=offre.assurance_pct_an,
                montant_max=offre.montant_max, frais_dossier_min=frais_dossier_min,
            )
            simulation_demandee = None
            if data.montant_souhaite <= offre.montant_max:
                simulation_demandee = _executer_simulation(offre, data.montant_souhaite, duree)
            resultats.append({
                "offre_id": str(offre.id),
                "nom_banque": offre.nom_banque,
                "duree_mois": duree,
                "mensualite_demande": round(simulation_demandee["mensualite"] + simulation_demandee["assurance_mensuelle"], 2) if simulation_demandee else None,
                "montant_dans_capacite_avec_prets": capacite_avec_prets["montant_max_indicatif"],
                "montant_dans_capacite_sans_prets": capacite_sans_prets["montant_max_indicatif"],
                "tableau_amortissement": simulation_demandee["tableau_amortissement"] if simulation_demandee else [],
            })

    # La capacite ne recommande pas une offre : on regroupe les calculs par
    # duree et conserve une estimation prudente pour chaque duree.
    resultats_par_duree = {}
    for ligne in resultats:
        duree = ligne["duree_mois"]
        existant = resultats_par_duree.get(duree)
        if not existant:
            resultats_par_duree[duree] = {
                "duree_mois": duree,
                "mensualite_demande": ligne["mensualite_demande"],
                "montant_dans_capacite_avec_prets": ligne["montant_dans_capacite_avec_prets"],
                "montant_dans_capacite_sans_prets": ligne["montant_dans_capacite_sans_prets"],
                "tableau_amortissement": ligne["tableau_amortissement"],
            }
        else:
            # On retient la capacite la plus prudente parmi les conditions actives.
            existant["montant_dans_capacite_avec_prets"] = min(
                existant["montant_dans_capacite_avec_prets"],
                ligne["montant_dans_capacite_avec_prets"],
            )
            existant["montant_dans_capacite_sans_prets"] = min(
                existant["montant_dans_capacite_sans_prets"],
                ligne["montant_dans_capacite_sans_prets"],
            )
    resultats = sorted(resultats_par_duree.values(), key=lambda ligne: ligne["duree_mois"])
    return {
        "revenu_mensuel": data.revenu_mensuel,
        "montant_souhaite": data.montant_souhaite,
        "charges_mensuelles": data.charges_mensuelles,
        "total_mensualites_prets_en_cours": data.total_mensualites_prets_en_cours,
        "seuil_endettement": data.seuil_endettement,
        "mensualite_max_avec_prets": round(max(0.0, mensualite_max_avec_prets), 2),
        "mensualite_max_sans_prets": round(max(0.0, mensualite_max_sans_prets), 2),
        "depassement_avec_prets": mensualite_max_avec_prets <= 0,
        "depassement_sans_prets": mensualite_max_sans_prets <= 0,
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
    simulation_id: str,
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

