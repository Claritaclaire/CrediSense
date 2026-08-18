from sqlalchemy import Column, String, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.database import Base

class SystemParameter(Base):
    """Clé/valeur de configuration applicative (ex. taux de base, marge, seuils)."""
    __tablename__ = "system_parameters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key = Column(String, unique=True, nullable=False, index=True)   # ex: "base_interest_rate"
    value = Column(Text, nullable=False)                           # stocké comme chaîne JSON
    description = Column(Text, nullable=True)
    is_sensitive = Column(Boolean, default=False)                  # masqué en UI si True