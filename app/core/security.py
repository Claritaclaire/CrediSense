import uuid
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User, RoleUtilisateur

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def creer_access_token(data: dict, expire_minutes: int | None = None) -> str:
    to_encode = data.copy()
    minutes = expire_minutes if expire_minutes is not None else settings.access_token_expire_minutes
    expire = datetime.now(timezone.utc) + timedelta(minutes=minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def creer_token_2fa_temporaire(user_id) -> str:
    """Jeton de courte duree (5 min) emis apres un mot de passe correct quand le
    2FA est actif. Porte un "purpose" distinct pour ne jamais etre accepte comme
    jeton de session normal par get_current_user, meme s'il est intercepte."""
    return creer_access_token({"sub": str(user_id), "purpose": "2fa_pending"}, expire_minutes=5)


def lire_token_2fa_temporaire(temp_token: str) -> uuid.UUID:
    """Decode un jeton temporaire 2FA et renvoie l'id utilisateur, ou leve une
    HTTPException 401 s'il est invalide, expire, ou n'est pas du bon type."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Code de vérification expiré ou invalide, reconnectez-vous.",
    )
    try:
        payload = jwt.decode(temp_token, settings.secret_key, algorithms=[settings.algorithm])
        if payload.get("purpose") != "2fa_pending":
            raise credentials_exception
        return uuid.UUID(payload.get("sub"))
    except (JWTError, ValueError, TypeError):
        raise credentials_exception


def creer_token_reset_mdp(user_id) -> str:
    """Jeton de reinitialisation de mot de passe (45 min), envoye par email.
    Meme principe que le jeton 2FA temporaire : un "purpose" dedie empeche
    qu'il soit utilisable comme jeton de session normal."""
    return creer_access_token({"sub": str(user_id), "purpose": "password_reset"}, expire_minutes=45)


def lire_token_reset_mdp(token: str) -> uuid.UUID:
    """Decode un jeton de reinitialisation et renvoie l'id utilisateur, ou leve
    une HTTPException 400 s'il est invalide, expire, ou n'est pas du bon type."""
    erreur = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Lien de réinitialisation invalide ou expiré, refaites une demande.",
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        if payload.get("purpose") != "password_reset":
            raise erreur
        return uuid.UUID(payload.get("sub"))
    except (JWTError, ValueError, TypeError):
        raise erreur


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Impossible de valider les identifiants",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id: str = payload.get("sub")
        if user_id is None or payload.get("purpose") in ("2fa_pending", "password_reset"):
            raise credentials_exception
        # Le "sub" du token est une chaine (str(user.id) a la connexion) ; le type
        # Uuid generique de SQLAlchemy (compatible MySQL/TiDB) exige un vrai objet
        # uuid.UUID pour construire la requete, contrairement a l'ancien type
        # PostgreSQL specifique qui acceptait une chaine brute.
        user_id_uuid = uuid.UUID(user_id)
    except (JWTError, ValueError):
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id_uuid).first()
    if user is None:
        raise credentials_exception
    return user


def exiger_role(*roles_autorises: RoleUtilisateur):
    """
    Fabrique une dépendance FastAPI qui vérifie que l'utilisateur connecté
    possède l'un des rôles autorisés, sinon renvoie une erreur 403.

    Usage : current_user: User = Depends(exiger_role(RoleUtilisateur.admin))
    """
    def dependance(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles_autorises:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Accès refusé : votre rôle ne permet pas cette action",
            )
        return current_user
    return dependance