from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.historique_pret import HistoriquePret
from app.models.offre_credit import OffreCredit
from app.models.user import User, RoleUtilisateur
from app.schemas.historique_pret import HistoriquePretCreate, HistoriquePretOut
from app.core.security import get_current_user, exiger_role
from app.core.exceptions import OffreNonTrouveeException

router = APIRouter(prefix="/historique-prets", tags=["Historique de prêts"])


@router.get("/", response_model=list[HistoriquePretOut])
def lister_mes_prets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(HistoriquePret).filter(HistoriquePret.user_id == current_user.id).all()


@router.post("/", response_model=HistoriquePretOut, status_code=201)
def ajouter_pret(
    data: HistoriquePretCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offre = db.query(OffreCredit).filter(OffreCredit.id == data.offre_id).first()
    if not offre:
        raise OffreNonTrouveeException()

    nouveau_pret = HistoriquePret(user_id=current_user.id, **data.model_dump())
    db.add(nouveau_pret)
    db.commit()
    db.refresh(nouveau_pret)
    return nouveau_pret


@router.delete("/{pret_id}", status_code=204)
def supprimer_pret(
    pret_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pret = db.query(HistoriquePret).filter(
        HistoriquePret.id == pret_id,
        HistoriquePret.user_id == current_user.id,
    ).first()
    if not pret:
        raise HTTPException(status_code=404, detail="Prêt introuvable")
    db.delete(pret)
    db.commit()


@router.get("/charges-totales")
def obtenir_charges_totales(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Renvoie la somme des mensualités de tous les prêts en cours de l'utilisateur,
    auprès de la banque. Utile pour calculer un taux d'endettement réel.
    """
    prets_en_cours = db.query(HistoriquePret).filter(
        HistoriquePret.user_id == current_user.id,
        HistoriquePret.statut == "en_cours",
    ).all()
    total_mensualites_prets = sum(p.mensualite for p in prets_en_cours)
    return {
        "total_mensualites_prets_en_cours": total_mensualites_prets,
        "nombre_prets_en_cours": len(prets_en_cours),
    }


# Nouveaux endpoints pour conseillers et admins
@router.get("/all", response_model=list[HistoriquePretOut], dependencies=[Depends(exiger_role([RoleUtilisateur.conseiller, RoleUtilisateur.admin]))])
def lister_tous_prets(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    """Endpoint réservé aux conseillers et admins pour voir l'historique de tous les prêts"""
    return db.query(HistoriquePret).offset(skip).limit(limit).all()