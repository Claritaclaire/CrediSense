import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, Float, Integer, DateTime, ForeignKey, Uuid
from sqlalchemy.orm import relationship

from app.database import Base


class Simulation(Base):
    __tablename__ = "simulations"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id"), nullable=False)
    offre_id = Column(Uuid, ForeignKey("offres_credit.id"), nullable=False)

    montant = Column(Float, nullable=False)
    duree_mois = Column(Integer, nullable=False)
    mensualite = Column(Float, nullable=False)
    taeg = Column(Float, nullable=False)
    cout_total = Column(Float, nullable=False)
    date_creation = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="simulations")
    offre = relationship("OffreCredit", back_populates="simulations")
    messages_ia = relationship("MessageIA", back_populates="simulation")
