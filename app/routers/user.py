from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.user import User, RoleUtilisateur
from app.schemas.user import UserOut, RoleUpdate, UserUpdate
from app.core.security import get_current_user, exiger_role

router = APIRouter(prefix="/users", tags=["Gestion des utilisateurs"])

@router.get("/", response_model=List[UserOut], dependencies=[Depends(exiger_role(RoleUtilisateur.admin))])
def lister_utilisateurs(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    """Liste tous les utilisateurs avec leurs rôles (réservé aux admins)"""
    utilisateurs = db.query(User).offset(skip).limit(limit).all()
    return utilisateurs

@router.get("/me", response_model=UserOut)
def obtenir_mon_profil(current_user: User = Depends(get_current_user)):
    """Obtient les détails de l'utilisateur connecté"""
    return current_user

@router.patch("/me", response_model=UserOut)
def modifier_mon_profil(
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Permet à l'utilisateur connecté de modifier son nom, email ou mot de passe"""
    if user_data.email and user_data.email != current_user.email:
        existant = db.query(User).filter(User.email == user_data.email).first()
        if existant:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cet email est déjà utilisé par un autre compte"
            )
        current_user.email = user_data.email

    if user_data.nom:
        current_user.nom = user_data.nom

    if user_data.password:
        from app.services.auth_service import hash_password
        current_user.password_hash = hash_password(user_data.password)

    db.commit()
    db.refresh(current_user)
    return current_user

@router.get("/{user_id}", response_model=UserOut)
def obtenir_utilisateur(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtient les détails d'un utilisateur spécifique"""
    # Un utilisateur peut voir son propre profil, un admin peut voir celui de n'importe qui
    if str(current_user.id) != user_id and current_user.role != RoleUtilisateur.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès non autorisé"
        )

    utilisateur = db.query(User).filter(User.id == user_id).first()
    if not utilisateur:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return utilisateur

@router.patch("/{user_id}/role", response_model=UserOut, dependencies=[Depends(exiger_role(RoleUtilisateur.admin))])
def modifier_role_utilisateur(
    user_id: str,
    role_data: RoleUpdate,
    db: Session = Depends(get_db)
):
    """Modifie le rôle d'un utilisateur (réservé aux admins)"""
    utilisateur = db.query(User).filter(User.id == user_id).first()
    if not utilisateur:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    # Empêcher un admin de se retirer ses propres privilèges accidentellement
    if utilisateur.role == RoleUtilisateur.admin and role_data.role != RoleUtilisateur.admin:
        admins_count = db.query(User).filter(User.role == RoleUtilisateur.admin).count()
        if admins_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Impossible de retirer le dernier administrateur"
            )

    utilisateur.role = role_data.role
    db.commit()
    db.refresh(utilisateur)
    return utilisateur