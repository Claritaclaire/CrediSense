import uuid
from datetime import date, datetime
from pydantic import BaseModel

from app.models.historique_pret import StatutPret


class HistoriquePretCreate(BaseModel):
    offre_id: uuid.UUID
    montant_initial: float
    mensualite: float
    duree_mois: int
    date_debut: date
    statut: StatutPret = StatutPret.en_cours


class HistoriquePretOut(BaseModel):
    id: uuid.UUID
    offre_id: uuid.UUID
    montant_initial: float
    mensualite: float
    duree_mois: int
    date_debut: date
    statut: StatutPret
    date_creation: datetime

    class Config:
        from_attributes = True