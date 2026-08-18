import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr

from app.models.user import RoleUtilisateur


class UserCreate(BaseModel):
    nom: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: uuid.UUID
    nom: str
    email: EmailStr
    role: RoleUtilisateur
    date_creation: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RoleUpdate(BaseModel):
    role: RoleUtilisateur


class UserUpdate(BaseModel):
    nom: str | None = None
    email: EmailStr | None = None
    password: str | None = None