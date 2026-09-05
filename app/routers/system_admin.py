import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.security import exiger_role
from app.database import get_db
from app.models.audit_log import ActionType, AdminAuditLog
from app.models.user import RoleUtilisateur, User
from app.schemas.system_admin import (
    AdministrateurBancaireCreate,
    AdministrateurBancaireOut,
    AdministrateurBancaireUpdate,
)
from app.services.auth_service import hash_password

router = APIRouter(
    prefix="/admin-systeme",
    tags=["Administration système"],
    dependencies=[Depends(exiger_role(RoleUtilisateur.admin_systeme))],
)


def _log(db: Session, admin: User, action: ActionType, target_id: Optional[str], details: dict):
    db.add(AdminAuditLog(
        admin_id=admin.id,
        action=action,
        target_table="users",
        target_id=target_id,
        details=json.dumps(details, ensure_ascii=False),
    ))


def _admin_bancaire_query(db: Session):
    return db.query(User).filter(User.role.in_([RoleUtilisateur.admin, RoleUtilisateur.conseiller]))


def _activite_out(db: Session, activite: AdminAuditLog):
    utilisateur = db.query(User).filter(User.id == activite.admin_id).first()
    return {
        "id": activite.id,
        "admin_id": activite.admin_id,
        "utilisateur_nom": utilisateur.nom if utilisateur else "Compte supprimé",
        "utilisateur_email": utilisateur.email if utilisateur else None,
        "action": activite.action,
        "target_table": activite.target_table,
        "target_id": activite.target_id,
        "details": activite.details,
        "timestamp": activite.timestamp,
    }


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    total_clients = db.query(User).filter(User.role == RoleUtilisateur.client).count()
    administrateurs = _admin_bancaire_query(db).count()
    comptes_actifs = db.query(User).filter(User.actif.is_(True)).count()
    comptes_desactives = db.query(User).filter(User.actif.is_(False)).count()
    activites = db.query(AdminAuditLog).order_by(AdminAuditLog.timestamp.desc()).limit(10).all()
    return {
        "total_clients": total_clients,
        "administrateurs_bancaires": administrateurs,
        "comptes_actifs": comptes_actifs,
        "comptes_desactives": comptes_desactives,
        "dernieres_activites": [_activite_out(db, activite) for activite in activites],
    }


@router.get("/administrateurs", response_model=list[AdministrateurBancaireOut])
def lister_administrateurs(
    recherche: Optional[str] = Query(default=None, max_length=120),
    db: Session = Depends(get_db),
):
    requete = _admin_bancaire_query(db)
    if recherche:
        terme = f"%{recherche}%"
        requete = requete.filter(or_(User.nom.ilike(terme), User.email.ilike(terme), User.banque.ilike(terme)))
    return [AdministrateurBancaireOut.from_user(user) for user in requete.order_by(User.nom).all()]


@router.post("/administrateurs", response_model=AdministrateurBancaireOut, status_code=status.HTTP_201_CREATED)
def creer_administrateur(
    data: AdministrateurBancaireCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(exiger_role(RoleUtilisateur.admin_systeme)),
):
    if data.role not in (RoleUtilisateur.admin, RoleUtilisateur.conseiller):
        raise HTTPException(status_code=422, detail="Le compte doit être un administrateur bancaire ou un conseiller.")
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=409, detail="Cette adresse e-mail est déjà utilisée.")
    user = User(
        nom=data.nom,
        email=data.email,
        password_hash=hash_password(data.password),
        telephone=data.telephone,
        banque=data.banque,
        agence=data.agence,
        role=data.role,
        actif=True,
        permissions=",".join(data.permissions),
    )
    db.add(user)
    db.flush()
    _log(db, current_user, ActionType.CREATE, str(user.id), {"nom": user.nom, "email": user.email})
    db.commit()
    db.refresh(user)
    return AdministrateurBancaireOut.from_user(user)


@router.patch("/administrateurs/{user_id}", response_model=AdministrateurBancaireOut)
def modifier_administrateur(
    user_id: str,
    data: AdministrateurBancaireUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(exiger_role(RoleUtilisateur.admin_systeme)),
):
    user = _admin_bancaire_query(db).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Administrateur bancaire introuvable.")
    valeurs = data.model_dump(exclude_unset=True)
    if valeurs.get("role") not in (None, RoleUtilisateur.admin, RoleUtilisateur.conseiller):
        raise HTTPException(status_code=422, detail="Le rôle système ne peut pas être attribué depuis cette page.")
    if "email" in valeurs and valeurs["email"] != user.email and db.query(User).filter(User.email == valeurs["email"]).first():
        raise HTTPException(status_code=409, detail="Cette adresse e-mail est déjà utilisée.")
    if "permissions" in valeurs:
        valeurs["permissions"] = ",".join(valeurs["permissions"])
    for cle, valeur in valeurs.items():
        setattr(user, cle, valeur)
    _log(db, current_user, ActionType.UPDATE, str(user.id), {"champs": list(valeurs)})
    db.commit()
    db.refresh(user)
    return AdministrateurBancaireOut.from_user(user)


@router.get("/activites")
def activites(limit: int = Query(default=100, ge=1, le=500), db: Session = Depends(get_db)):
    logs = db.query(AdminAuditLog).order_by(AdminAuditLog.timestamp.desc()).limit(limit).all()
    return [_activite_out(db, activite) for activite in logs]
