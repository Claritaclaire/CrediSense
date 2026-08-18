from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Literal, Optional
from uuid import UUID

from app.database import get_db
from app.models.offre_credit import OffreCredit
from app.schemas.offre_credit import OffreCreditCreate, OffreCreditUpdate, OffreCreditOut
from app.core.security import get_current_user, exiger_role
from app.models.user import RoleUtilisateur

router = APIRouter(prefix="/offres", tags=["Offres de crédit"])

# Public : lister toutes les offres
@router.get("/", response_model=List[OffreCreditOut])
def lister_offres(
    db: Session = Depends(get_db),
    categorie_client: Optional[Literal["particulier", "professionnel"]] = None,
    skip: int = 0,
    limit: int = 100
):
    requete = db.query(OffreCredit).filter(OffreCredit.actif.is_(True))
    if categorie_client:
        requete = requete.filter(OffreCredit.categorie_client == categorie_client)
    offres = requete.order_by(OffreCredit.categorie_client, OffreCredit.nom_banque).offset(skip).limit(limit).all()
    return offres

# Public : récupérer une offre précise
@router.get("/{offre_id}", response_model=OffreCreditOut)
def obtenir_offre(
    offre_id: UUID,
    db: Session = Depends(get_db)
):
    offre = db.query(OffreCredit).filter(OffreCredit.id == offre_id).first()
    if not offre:
        raise HTTPException(status_code=404, detail="Offre non trouvée")
    return offre

# Admin : créer une nouvelle offre
@router.post("/", response_model=OffreCreditOut, status_code=status.HTTP_201_CREATED, dependencies=[Depends(exiger_role(RoleUtilisateur.admin))])
def creer_offre(
    offre_data: OffreCreditCreate,
    db: Session = Depends(get_db)
):
    offre = OffreCredit(**offre_data.model_dump())
    db.add(offre)
    db.commit()
    db.refresh(offre)
    return offre

# Admin : mettre à jour partiellement une offre (PATCH)
@router.patch("/{offre_id}", response_model=OffreCreditOut, dependencies=[Depends(exiger_role(RoleUtilisateur.admin))])
def mettre_a_jour_offre(
    offre_id: UUID,
    offre_data: OffreCreditUpdate,
    db: Session = Depends(get_db)
):
    offre = db.query(OffreCredit).filter(OffreCredit.id == offre_id).first()
    if not offre:
        raise HTTPException(status_code=404, detail="Offre non trouvée")

    update_data = offre_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(offre, field, value)

    db.commit()
    db.refresh(offre)
    return offre

# Admin : supprimer une offre
@router.delete("/{offre_id}", status_code=204, dependencies=[Depends(exiger_role(RoleUtilisateur.admin))])
def supprimer_offre(
    offre_id: UUID,
    db: Session = Depends(get_db)
):
    offre = db.query(OffreCredit).filter(OffreCredit.id == offre_id).first()
    if not offre:
        raise HTTPException(status_code=404, detail="Offre non trouvée")
    db.delete(offre)
    db.commit()
    return None
