"""
Tests de bout en bout pour l'authentification a deux facteurs (2FA/TOTP).

Utilise un vrai client de test contre la base configuree (comme le reste de
l'app) : un utilisateur temporaire est cree puis supprime a la fin de chaque
test pour ne rien laisser derriere.
"""
import pyotp
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.models.user import User

client = TestClient(app)


@pytest.fixture
def utilisateur_test():
    email = "test-2fa-pytest@example.com"
    db = SessionLocal()
    db.query(User).filter(User.email == email).delete()
    db.commit()
    db.close()

    reponse = client.post(
        "/auth/register",
        json={"nom": "Test 2FA", "email": email, "password": "motdepasse123"},
    )
    assert reponse.status_code == 201

    yield email

    db = SessionLocal()
    db.query(User).filter(User.email == email).delete()
    db.commit()
    db.close()


def test_login_sans_2fa_renvoie_directement_un_token(utilisateur_test):
    reponse = client.post("/auth/login", json={"email": utilisateur_test, "password": "motdepasse123"})
    assert reponse.status_code == 200
    data = reponse.json()
    assert data["requires_2fa"] is False
    assert data["access_token"]


def test_activation_puis_connexion_avec_2fa(utilisateur_test):
    # Connexion initiale pour obtenir un token et activer le 2FA
    reponse = client.post("/auth/login", json={"email": utilisateur_test, "password": "motdepasse123"})
    headers = {"Authorization": f"Bearer {reponse.json()['access_token']}"}

    # Activation
    reponse = client.post("/auth/2fa/setup", headers=headers)
    assert reponse.status_code == 200
    secret = reponse.json()["secret"]
    assert len(reponse.json()["qr_code_base64"]) > 0

    code = pyotp.TOTP(secret).now()
    reponse = client.post("/auth/2fa/confirm", json={"code": code}, headers=headers)
    assert reponse.status_code == 200
    assert reponse.json()["otp_enabled"] is True

    # La connexion exige desormais le code
    reponse = client.post("/auth/login", json={"email": utilisateur_test, "password": "motdepasse123"})
    data = reponse.json()
    assert data["requires_2fa"] is True
    assert data["access_token"] is None
    temp_token = data["temp_token"]

    # Le jeton temporaire ne doit jamais fonctionner comme un jeton de session normal
    reponse = client.get("/users/me", headers={"Authorization": f"Bearer {temp_token}"})
    assert reponse.status_code == 401

    # Un mauvais code est rejete
    reponse = client.post("/auth/login/2fa", json={"temp_token": temp_token, "code": "000000"})
    assert reponse.status_code == 401

    # Le bon code complete la connexion
    code = pyotp.TOTP(secret).now()
    reponse = client.post("/auth/login/2fa", json={"temp_token": temp_token, "code": code})
    assert reponse.status_code == 200
    vrai_token = reponse.json()["access_token"]

    reponse = client.get("/users/me", headers={"Authorization": f"Bearer {vrai_token}"})
    assert reponse.status_code == 200

    # Desactivation
    reponse = client.post(
        "/auth/2fa/disable",
        json={"password": "motdepasse123"},
        headers={"Authorization": f"Bearer {vrai_token}"},
    )
    assert reponse.status_code == 200
    assert reponse.json()["otp_enabled"] is False
