import uuid
from pydantic import BaseModel, field_validator
from typing import Literal, Optional

# Plafond "TBB + marge (maximum 15 %)" des conditions tarifaires CCA Bank.
TAUX_ANNUEL_MAX = 0.15


def _valider_taux(taux: float | None) -> float | None:
    if taux is None:
        return taux
    if taux < 0 or taux > TAUX_ANNUEL_MAX:
        raise ValueError(
            "Le taux annuel doit être compris entre 0 et 0.15 (15 %, plafond des conditions "
            "tarifaires CCA Bank). Saisissez-le en fraction : 0.12 pour 12 %."
        )
    return taux


def _valider_frais_min(frais: float | None) -> float | None:
    if frais is not None and frais < 0:
        raise ValueError("Les frais de dossier minimum ne peuvent pas être négatifs.")
    return frais


class OffreCreditBase(BaseModel):
    nom_banque: str
    description: str | None = None
    categorie_client: Literal["particulier", "professionnel"] = "particulier"
    actif: bool = True
    taux_annuel: float
    duree_min_mois: int
    duree_max_mois: int
    frais_dossier_pct: float
    frais_dossier_min: float = 0.0
    assurance_pct_an: float
    montant_max: float


class OffreCreditCreate(OffreCreditBase):
    _taux = field_validator("taux_annuel")(_valider_taux)
    _frais_min = field_validator("frais_dossier_min")(_valider_frais_min)


class OffreCreditUpdate(BaseModel):
    nom_banque: Optional[str] = None
    categorie_client: Optional[Literal["particulier", "professionnel"]] = None
    actif: Optional[bool] = None
    taux_annuel: Optional[float] = None
    duree_min_mois: Optional[int] = None
    duree_max_mois: Optional[int] = None
    frais_dossier_pct: Optional[float] = None
    frais_dossier_min: Optional[float] = None
    assurance_pct_an: Optional[float] = None
    montant_max: Optional[float] = None

    _taux = field_validator("taux_annuel")(_valider_taux)
    _frais_min = field_validator("frais_dossier_min")(_valider_frais_min)


class OffreCreditOut(OffreCreditBase):
    id: uuid.UUID

    class Config:
        from_attributes = True
