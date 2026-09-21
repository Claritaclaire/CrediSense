from sqlalchemy import Column, String, Text, DateTime, Enum as SQLEnum, Uuid
import uuid, enum, json
from datetime import datetime, timezone
from app.database import Base
from app.models.user import User

class ActionType(str, enum.Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    LOGIN = "login"
    LOGOUT = "logout"
    ROLE_CHANGE = "role_change"

class AdminAuditLog(Base):
    """Journal des actions effectuées par un administrateur."""
    __tablename__ = "admin_audit_logs"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    admin_id = Column(Uuid, nullable=False)   # FK vers User (pas de contrainte pour simplifier)
    action = Column(SQLEnum(ActionType, native_enum=False), nullable=False)
    target_table = Column(String(100), nullable=True)   # ex: "users", "system_parameters"
    target_id = Column(String(100), nullable=True)      # UUID de l’enregistrement cible
    details = Column(Text, nullable=True)          # JSON avec les champs modifiés
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)