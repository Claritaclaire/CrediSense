from pydantic import BaseModel
from app.models.demande_credit import StatutDemande
from uuid import UUID
from datetime import datetime
from typing import Optional


class DemandeCreditBase(BaseModel):
    montant_demande: float
    duree_souhaitee: int
    apport: float = 0.0
    motif: Optional[str] = None


class DemandeCreditCreate(DemandeCreditBase):
    pass


class DemandeCreditOut(DemandeCreditBase):
    id: UUID
    user_id: UUID
    simulation_id: Optional[UUID]
    statut: StatutDemande
    date_creation: datetime
    date_mise_a_jour: datetime
    traite_par_id: Optional[UUID]

    class Config:
        from_attributes = True


class DemandeCreditUpdate(BaseModel):
    montant_demande: Optional[float] = None
    duree_souhaitee: Optional[int] = None
    apport: Optional[float] = None
    motif: Optional[str] = None
    statut: Optional[StatutDemande] = None


class StatutUpdate(BaseModel):
    statut: StatutDemande