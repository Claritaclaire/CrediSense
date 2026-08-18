from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User, RoleUtilisateur

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def creer_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Impossible de valider les identifiants",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
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