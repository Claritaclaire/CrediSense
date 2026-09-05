import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.models.user import RoleUtilisateur


class AdministrateurBancaireCreate(BaseModel):
    nom: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8)
    telephone: Optional[str] = Field(default=None, max_length=30)
    banque: Optional[str] = Field(default=None, max_length=120)
    agence: Optional[str] = Field(default=None, max_length=120)
    role: RoleUtilisateur = RoleUtilisateur.admin
    permissions: list[str] = Field(default_factory=list)


class AdministrateurBancaireUpdate(BaseModel):
    nom: Optional[str] = Field(default=None, min_length=2, max_length=120)
    email: Optional[EmailStr] = None
    telephone: Optional[str] = Field(default=None, max_length=30)
    banque: Optional[str] = Field(default=None, max_length=120)
    agence: Optional[str] = Field(default=None, max_length=120)
    role: Optional[RoleUtilisateur] = None
    actif: Optional[bool] = None
    permissions: Optional[list[str]] = None


class AdministrateurBancaireOut(BaseModel):
    id: uuid.UUID
    nom: str
    email: EmailStr
    telephone: Optional[str] = None
    banque: Optional[str] = None
    agence: Optional[str] = None
    role: RoleUtilisateur
    actif: bool
    permissions: list[str] = Field(default_factory=list)
    date_creation: datetime

    @classmethod
    def from_user(cls, user):
        return cls(
            id=user.id,
            nom=user.nom,
            email=user.email,
            telephone=user.telephone,
            banque=user.banque,
            agence=user.agence,
            role=user.role,
            actif=user.actif,
            permissions=[item for item in (user.permissions or "").split(",") if item],
            date_creation=user.date_creation,
        )
