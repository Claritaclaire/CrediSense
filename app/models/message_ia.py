import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Uuid
from sqlalchemy.orm import relationship

from app.database import Base


class MessageIA(Base):
    __tablename__ = "messages_ia"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    simulation_id = Column(Uuid, ForeignKey("simulations.id"), nullable=True)
    type = Column(String(50), nullable=False)  # "recommandation" ou "explication_clause"
    contenu_entree = Column(Text, nullable=False)
    contenu_reponse = Column(Text, nullable=False)
    date_creation = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    simulation = relationship("Simulation", back_populates="messages_ia")
