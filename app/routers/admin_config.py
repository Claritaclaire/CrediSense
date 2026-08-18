from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import json

from app.database import get_db
from app.models.system_setting import SystemParameter
from app.schemas.system_setting import (
    SystemParameterCreate,
    SystemParameterUpdate,
    SystemParameterOut,
)
from app.models.audit_log import AdminAuditLog, ActionType
from app.schemas.audit_log import AuditLogCreate
from app.core.security import get_current_user, exiger_role
from app.models.user import User, RoleUtilisateur

router = APIRouter(
    prefix="/admin/config",
    tags=["Admin - Configuration"],
    dependencies=[Depends(exiger_role(RoleUtilisateur.admin))],
)

def _log_action(
    db: Session,
    admin_id: str,
    action: ActionType,
    target_table: str | None,
    target_id: str | None,
    details: dict | None,
):
    log = AdminAuditLog(
        admin_id=admin_id,
        action=action,
        target_table=target_table,
        target_id=target_id,
        details=json.dumps(details) if details else None,
    )
    db.add(log)
    db.commit()

# ----- CRUD sur les paramètres -----
@router.get("/", response_model=List[SystemParameterOut])
def list_params(db: Session = Depends(get_db)):
    return db.query(SystemParameter).all()

@router.post("/", response_model=SystemParameterOut, status_code=status.HTTP_201_CREATED)
def create_param(
    payload: SystemParameterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if db.query(SystemParameter).filter(SystemParameter.key == payload.key).first():
        raise HTTPException(status_code=400, detail="Clé déjà existante")
    obj = SystemParameter(**payload.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    _log_action(db, str(current_user.id), ActionType.CREATE, "system_parameters", obj.id, payload.dict())
    return obj

@router.patch("/{param_id}", response_model=SystemParameterOut)
def update_param(
    param_id: str,
    payload: SystemParameterUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = db.query(SystemParameter).filter(SystemParameter.id == param_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Paramètre introuvable")
    update_data = payload.dict(exclude_unset=True)
    for k, v in update_data.items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    _log_action(db, str(current_user.id), ActionType.UPDATE, "system_parameters", obj.id, update_data)
    return obj

@router.delete("/{param_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_param(
    param_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = db.query(SystemParameter).filter(SystemParameter.id == param_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Paramètre introuvable")
    db.delete(obj)
    db.commit()
    _log_action(db, str(current_user.id), ActionType.DELETE, "system_parameters", param_id, {"key": obj.key})
    return None