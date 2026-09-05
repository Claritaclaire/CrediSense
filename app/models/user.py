import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, String, DateTime, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class RoleUtilisateur(str, enum.Enum):
    client = "client"
    conseiller = "conseiller"
    admin = "admin"
    admin_systeme = "admin_systeme"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nom = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    telephone = Column(String, nullable=True)
    banque = Column(String, nullable=True)
    agence = Column(String, nullable=True)
    actif = Column(Boolean, nullable=False, default=True, server_default="true")
    permissions = Column(String, nullable=True)
    role = Column(SQLEnum(RoleUtilisateur), default=RoleUtilisateur.client, nullable=False)
    date_creation = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    simulations = relationship("Simulation", back_populates="user")
    historique_prets = relationship("HistoriquePret", back_populates="user")
    demandes_credit = relationship("DemandeCredit", foreign_keys="DemandeCredit.user_id", back_populates="user")