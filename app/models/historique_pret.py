import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, Float, Integer, Date, DateTime, ForeignKey, Enum as SQLEnum, Uuid
from sqlalchemy.orm import relationship

from app.database import Base


class StatutPret(str, enum.Enum):
    en_cours = "en_cours"
    solde = "solde"


class HistoriquePret(Base):
    __tablename__ = "historique_prets"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id"), nullable=False)
    offre_id = Column(Uuid, ForeignKey("offres_credit.id"), nullable=False)

    montant_initial = Column(Float, nullable=False)
    mensualite = Column(Float, nullable=False)
    duree_mois = Column(Integer, nullable=False)
    date_debut = Column(Date, nullable=False)
    statut = Column(SQLEnum(StatutPret, native_enum=False), default=StatutPret.en_cours, nullable=False)

    date_creation = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="historique_prets")
    offre = relationship("OffreCredit")