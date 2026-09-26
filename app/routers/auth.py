import base64
import io
import logging

import pyotp
import qrcode
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserOut,
    Token,
    LoginOut,
    Login2FAIn,
    TwoFactorSetupOut,
    TwoFactorConfirmIn,
    TwoFactorDisableIn,
    MotDePasseOublieIn,
    ReinitialiserMotDePasseIn,
)
from app.services.auth_service import hash_password, verifier_password
from app.utils.mail import send_email
from app.core.security import (
    creer_access_token,
    creer_token_2fa_temporaire,
    lire_token_2fa_temporaire,
    creer_token_reset_mdp,
    lire_token_reset_mdp,
    get_current_user,
)

router = APIRouter(prefix="/auth", tags=["Authentification"])
logger = logging.getLogger(__name__)


def _envoyer_email_reset(destinataire: str, nom: str, lien: str) -> None:
    try:
        send_email(
            "Réinitialisation de votre mot de passe CrediSense",
            [destinataire],
            f"""Bonjour {nom},

Vous avez demandé la réinitialisation de votre mot de passe CrediSense.

Cliquez sur ce lien pour choisir un nouveau mot de passe (valable 45 minutes) :
{lien}

Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email : votre mot de passe actuel reste inchangé.

Cordialement,
CrediSense
""",
        )
    except Exception:
        logger.exception("Échec d'envoi de l'email de réinitialisation vers %s", destinataire)


def _emettre_token(user: User) -> dict:
    access_token = creer_access_token(data={"sub": str(user.id), "role": user.role.value})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")

    nouvel_utilisateur = User(
        nom=user_data.nom,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        telephone=user_data.telephone,
    )
    db.add(nouvel_utilisateur)
    db.commit()
    db.refresh(nouvel_utilisateur)
    return nouvel_utilisateur


@router.post("/login", response_model=LoginOut)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verifier_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    if not user.actif:
        raise HTTPException(status_code=403, detail="Ce compte est désactivé. Contactez l’administrateur système.")

    if user.otp_enabled:
        # Mot de passe correct, mais le compte a le 2FA actif : on ne delivre pas
        # encore de jeton de session, seulement un jeton temporaire (5 min) qui ne
        # sert qu'a completer l'etape suivante avec le code a 6 chiffres.
        return {
            "requires_2fa": True,
            "temp_token": creer_token_2fa_temporaire(user.id),
        }

    return {"requires_2fa": False, **_emettre_token(user)}


@router.post("/login/2fa", response_model=Token)
def login_2fa(data: Login2FAIn, db: Session = Depends(get_db)):
    user_id = lire_token_2fa_temporaire(data.temp_token)
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.otp_enabled or not user.otp_secret:
        raise HTTPException(status_code=401, detail="Code de vérification expiré ou invalide, reconnectez-vous.")

    totp = pyotp.TOTP(user.otp_secret)
    if not totp.verify(data.code, valid_window=1):
        raise HTTPException(status_code=401, detail="Code de vérification incorrect.")

    return _emettre_token(user)


@router.post("/2fa/setup", response_model=TwoFactorSetupOut)
def setup_2fa(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Genere un nouveau secret TOTP (pas encore actif tant que /2fa/confirm
    n'a pas verifie un code valide, pour eviter de s'enfermer hors de son
    compte avec un secret jamais reellement scanne)."""
    secret = pyotp.random_base32()
    current_user.otp_secret = secret
    current_user.otp_enabled = False
    db.commit()

    uri = pyotp.totp.TOTP(secret).provisioning_uri(name=current_user.email, issuer_name="CrediSense")
    image = qrcode.make(uri)
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    qr_base64 = base64.b64encode(buffer.getvalue()).decode("ascii")

    return {"secret": secret, "qr_code_base64": qr_base64}


@router.post("/2fa/confirm", response_model=UserOut)
def confirm_2fa(
    data: TwoFactorConfirmIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.otp_secret:
        raise HTTPException(status_code=400, detail="Aucune configuration 2FA en attente. Relancez /auth/2fa/setup.")

    totp = pyotp.TOTP(current_user.otp_secret)
    if not totp.verify(data.code, valid_window=1):
        raise HTTPException(status_code=401, detail="Code de vérification incorrect.")

    current_user.otp_enabled = True
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/2fa/disable", response_model=UserOut)
def disable_2fa(
    data: TwoFactorDisableIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verifier_password(data.password, current_user.password_hash):
        raise HTTPException(status_code=401, detail="Mot de passe incorrect.")

    current_user.otp_enabled = False
    current_user.otp_secret = None
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/mot-de-passe-oublie")
def mot_de_passe_oublie(
    data: MotDePasseOublieIn,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    # Reponse volontairement identique que l'email existe ou non, pour ne pas
    # laisser deviner quels emails sont inscrits (enumeration de comptes).
    reponse = {"message": "Si un compte existe avec cet email, un lien de réinitialisation vient de lui être envoyé."}

    user = db.query(User).filter(User.email == data.email).first()
    if not user or not user.actif:
        return reponse

    lien = f"{settings.frontend_url.rstrip('/')}/reinitialiser-mot-de-passe?token={creer_token_reset_mdp(user.id)}"
    background_tasks.add_task(_envoyer_email_reset, user.email, user.nom, lien)
    return reponse


@router.post("/reinitialiser-mot-de-passe")
def reinitialiser_mot_de_passe(data: ReinitialiserMotDePasseIn, db: Session = Depends(get_db)):
    if len(data.nouveau_mot_de_passe) < 6:
        raise HTTPException(status_code=422, detail="Le mot de passe doit contenir au moins 6 caractères.")

    user_id = lire_token_reset_mdp(data.token)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="Lien de réinitialisation invalide ou expiré, refaites une demande.")

    user.password_hash = hash_password(data.nouveau_mot_de_passe)
    db.commit()
    return {"message": "Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter."}
