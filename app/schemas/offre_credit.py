import uuid
from pydantic import BaseModel, Field
from typing import Literal, Optional


class OffreCreditBase(BaseModel):
    nom_banque: str
    description: str | None = None
    categorie_client: Literal["particulier", "professionnel"] = "particulier"
    actif: bool = True
    taux_annuel: float
    duree_min_mois: int
    duree_max_mois: int
    frais_dossier_pct: float
    assurance_pct_an: float
    montant_max: float


class OffreCreditCreate(OffreCreditBase):
    pass


class OffreCreditUpdate(BaseModel):
    nom_banque: Optional[str] = None
    categorie_client: Optional[Literal["particulier", "professionnel"]] = None
    actif: Optional[bool] = None
    taux_annuel: Optional[float] = None
    duree_min_mois: Optional[int] = None
    duree_max_mois: Optional[int] = None
    frais_dossier_pct: Optional[float] = None
    assurance_pct_an: Optional[float] = None
    montant_max: Optional[float] = None


class OffreCreditOut(OffreCreditBase):
    id: uuid.UUID

    class Config:
        from_attributes = True
