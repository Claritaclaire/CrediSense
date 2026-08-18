import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class MessageIA(Base):
    __tablename__ = "messages_ia"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    simulation_id = Column(UUID(as_uuid=True), ForeignKey("simulations.id"), nullable=True)
    type = Column(String, nullable=False)  # "recommandation" ou "explication_clause"
    contenu_entree = Column(Text, nullable=False)
    contenu_reponse = Column(Text, nullable=False)
    date_creation = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    simulation = relationship("Simulation", back_populates="messages_ia")
