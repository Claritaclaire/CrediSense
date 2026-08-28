import uuid
from datetime import datetime
from pydantic import BaseModel


class SimulationCreate(BaseModel):
    offre_id: uuid.UUID
    montant: float
    duree_mois: int


class LigneAmortissement(BaseModel):
    mois: int
    capital_restant_debut: float
    interets: float
    part_capital: float
    mensualite: float
    capital_restant_fin: float


class SimulationOut(BaseModel):
    id: uuid.UUID
    offre_id: uuid.UUID | None = None
    nom_banque: str | None = None
    montant: float
    duree_mois: int
    mensualite: float
    taeg: float
    cout_total: float
    date_creation: datetime
    tableau_amortissement: list[LigneAmortissement] | None = None

    class Config:
        from_attributes = True


class ComparaisonRequest(BaseModel):
    montant: float
    duree_mois: int
    offre_ids: list[uuid.UUID]


class CapaciteRequest(BaseModel):
    revenu_mensuel: float
    montant_souhaite: float
    charges_mensuelles: float = 0.0
    total_mensualites_prets_en_cours: float = 0.0
    seuil_endettement: float = 33.0
