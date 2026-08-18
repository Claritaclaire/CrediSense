import uuid

from sqlalchemy import Boolean, Column, String, Float, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class OffreCredit(Base):
    __tablename__ = "offres_credit"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nom_banque = Column(String, nullable=False)
    categorie_client = Column(String, nullable=False, default="particulier", server_default="particulier")
    actif = Column(Boolean, nullable=False, default=True, server_default="true")
    taux_annuel = Column(Float, nullable=False)          # ex. 0.145
    duree_min_mois = Column(Integer, nullable=False)
    duree_max_mois = Column(Integer, nullable=False)
    frais_dossier_pct = Column(Float, nullable=False)     # ex. 0.015
    assurance_pct_an = Column(Float, nullable=False)       # ex. 0.004
    montant_max = Column(Float, nullable=False)

    simulations = relationship("Simulation", back_populates="offre")
    historique_prets = relationship("HistoriquePret", back_populates="offre")
