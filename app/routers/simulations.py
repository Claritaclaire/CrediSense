from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.offre_credit import OffreCredit
from app.models.simulation import Simulation
from app.models.user import User, RoleUtilisateur
from app.schemas.simulation import SimulationCreate, SimulationOut, ComparaisonRequest
from app.services.calculs_financiers import simuler_credit
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

    return simuler_credit(
        capital=montant,
        taux_annuel=offre.taux_annuel,
        duree_mois=duree_mois,
        frais_dossier_pct=offre.frais_dossier_pct,
        assurance_pct_an=offre.assurance_pct_an,
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

