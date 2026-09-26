import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr

from app.models.user import RoleUtilisateur


class UserCreate(BaseModel):
    nom: str
    email: EmailStr
    password: str
    telephone: str | None = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: uuid.UUID
    nom: str
    email: EmailStr
    role: RoleUtilisateur
    telephone: str | None = None
    banque: str | None = None
    agence: str | None = None
    actif: bool = True
    permissions: str | None = None
    otp_enabled: bool = False
    date_creation: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginOut(BaseModel):
    """Reponse de /auth/login : soit un token complet, soit une demande de code 2FA."""
    requires_2fa: bool = False
    access_token: str | None = None
    token_type: str = "bearer"
    temp_token: str | None = None


class Login2FAIn(BaseModel):
    temp_token: str
    code: str


class TwoFactorSetupOut(BaseModel):
    secret: str
    qr_code_base64: str


class TwoFactorConfirmIn(BaseModel):
    code: str


class TwoFactorDisableIn(BaseModel):
    password: str


class RoleUpdate(BaseModel):
    role: RoleUtilisateur


class UserUpdate(BaseModel):
    nom: str | None = None
    email: EmailStr | None = None
    password: str | None = None
    telephone: str | None = None