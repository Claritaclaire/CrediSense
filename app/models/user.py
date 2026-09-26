import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, String, DateTime, Enum as SQLEnum, Uuid
from sqlalchemy.orm import relationship

from app.database import Base


class RoleUtilisateur(str, enum.Enum):
    client = "client"
    conseiller = "conseiller"
    admin = "admin"
    admin_systeme = "admin_systeme"


class User(Base):
    __tablename__ = "users"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    nom = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    telephone = Column(String(50), nullable=True)
    banque = Column(String(100), nullable=True)
    agence = Column(String(100), nullable=True)
    actif = Column(Boolean, nullable=False, default=True, server_default="1")
    permissions = Column(String(500), nullable=True)
    otp_secret = Column(String(64), nullable=True)
    otp_enabled = Column(Boolean, nullable=False, default=False, server_default="0")
    role = Column(SQLEnum(RoleUtilisateur, native_enum=False), default=RoleUtilisateur.client, nullable=False)
    date_creation = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    simulations = relationship("Simulation", back_populates="user")
    historique_prets = relationship("HistoriquePret", back_populates="user")
    demandes_credit = relationship("DemandeCredit", foreign_keys="DemandeCredit.user_id", back_populates="user")