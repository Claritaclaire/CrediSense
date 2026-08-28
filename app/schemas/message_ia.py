import uuid
from typing import Optional
from pydantic import BaseModel
from datetime import datetime


class RecommandationRequest(BaseModel):
    revenu_mensuel: float
    apport: float
    montant_souhaite: float
    duree_mois: int
    offre_id: Optional[uuid.UUID] = None
    projet: Optional[str] = None
    profession: Optional[str] = None
    charges_mensuelles: Optional[float] = 0.0
    total_mensualites_prets_en_cours: Optional[float] = 0.0


class ExplicationClauseRequest(BaseModel):
    texte_clause: str


class AssistantRequest(BaseModel):
    question: str
    page: Optional[str] = None


class MessageIAOut(BaseModel):
    id: uuid.UUID
    simulation_id: Optional[uuid.UUID] = None
    type: str
    contenu_entree: str
    contenu_reponse: str
    date_creation: datetime

    class Config:
        from_attributes = True
