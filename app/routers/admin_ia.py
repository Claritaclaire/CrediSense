from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.message_ia import MessageIA
from app.schemas.message_ia import MessageIAOut
from app.core.security import get_current_user, exiger_role
from app.models.user import User, RoleUtilisateur

router = APIRouter(
    prefix="/admin/ia",
    tags=["Admin - IA"],
    dependencies=[Depends(exiger_role(RoleUtilisateur.admin))],
)

@router.get("/", response_model=List[MessageIAOut])
def list_all_messages(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    return (
        db.query(MessageIA)
        .order_by(MessageIA.id.desc())   # or .timestamp if you add one
        .offset(skip)
        .limit(limit)
        .all()
    )