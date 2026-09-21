import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum, Float, Integer, Text, Uuid
from sqlalchemy.orm import relationship
from app.database import Base


class StatutDemande(str, enum.Enum):
    en_attente = "en_attente"
    en_cours_traitement = "en_cours_traitement"
    demande_documents = "demande_documents"
    approuvee = "approuvee"
    refusee = "refusee"
    sans_suite = "sans_suite"


class DemandeCredit(Base):
    __tablename__ = "demandes_credit"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id"), nullable=False)
    simulation_id = Column(Uuid, ForeignKey("simulations.id"), nullable=True)  # Optionnel

    montant_demande = Column(Float, nullable=False)
    duree_souhaitee = Column(Integer, nullable=False)
    apport = Column(Float, default=0.0)
    motif = Column(Text, nullable=True)  # Pourquoi ce crédit ?

    statut = Column(SQLEnum(StatutDemande, native_enum=False), default=StatutDemande.en_attente, nullable=False)
    date_creation = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    date_mise_a_jour = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))

    # Relation avec l'utilisateur qui a traité la demande (conseiller/admin)
    traite_par_id = Column(Uuid, ForeignKey("users.id"), nullable=True)
    traite_par = relationship("User", foreign_keys=[traite_par_id])

    # Relations
    user = relationship("User", foreign_keys=[user_id], back_populates="demandes_credit")
    simulation = relationship("Simulation")