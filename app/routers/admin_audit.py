from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.audit_log import AdminAuditLog
from app.schemas.audit_log import AuditLogOut
from app.core.security import get_current_user, exiger_role
from app.models.user import User, RoleUtilisateur

router = APIRouter(
    prefix="/admin/audit",
    tags=["Admin - Audit"],
    dependencies=[Depends(exiger_role(RoleUtilisateur.admin))],
)

@router.get("/", response_model=List[AuditLogOut])
def list_audit(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    return (
        db.query(AdminAuditLog)
        .order_by(AdminAuditLog.timestamp.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )