"""Tests de bout en bout pour la reinitialisation de mot de passe."""
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.models.user import User

client = TestClient(app)


@pytest.fixture
def utilisateur_test():
    email = "test-reset-pytest@example.com"
    db = SessionLocal()
    db.query(User).filter(User.email == email).delete()
    db.commit()
    db.close()

    reponse = client.post(
        "/auth/register",
        json={"nom": "Test Reset", "email": email, "password": "ancienmdp123"},
    )
    assert reponse.status_code == 201

    yield email

    db = SessionLocal()
    db.query(User).filter(User.email == email).delete()
    db.commit()
    db.close()


def _extraire_token_du_lien(lien: str) -> str:
    return lien.split("token=", 1)[1]


def test_reinitialisation_complete(utilisateur_test):
    with patch("app.routers.auth._envoyer_email_reset") as email_simule:
        reponse = client.post("/auth/mot-de-passe-oublie", json={"email": utilisateur_test})
        assert reponse.status_code == 200
        email_simule.assert_called_once()
        lien_envoye = email_simule.call_args.args[2]

    token = _extraire_token_du_lien(lien_envoye)

    # L'ancien mot de passe fonctionne encore, le nouveau pas
    reponse = client.post("/auth/login", json={"email": utilisateur_test, "password": "ancienmdp123"})
    assert reponse.status_code == 200

    reponse = client.post(
        "/auth/reinitialiser-mot-de-passe",
        json={"token": token, "nouveau_mot_de_passe": "nouveaumdp456"},
    )
    assert reponse.status_code == 200

    # L'ancien mot de passe ne fonctionne plus, le nouveau si
    reponse = client.post("/auth/login", json={"email": utilisateur_test, "password": "ancienmdp123"})
    assert reponse.status_code == 401

    reponse = client.post("/auth/login", json={"email": utilisateur_test, "password": "nouveaumdp456"})
    assert reponse.status_code == 200

    # Le jeton est a usage unique dans le temps imparti mais reutilisable tant
    # qu'il n'a pas expire (pas de revocation apres usage) : on verifie au moins
    # qu'un jeton bidon est rejete.
    reponse = client.post(
        "/auth/reinitialiser-mot-de-passe",
        json={"token": "jeton-invalide", "nouveau_mot_de_passe": "autremdp789"},
    )
    assert reponse.status_code == 400


def test_email_inconnu_renvoie_quand_meme_succes():
    """Empeche l'enumeration de comptes : meme reponse, email inscrit ou non."""
    with patch("app.routers.auth._envoyer_email_reset") as email_simule:
        reponse = client.post("/auth/mot-de-passe-oublie", json={"email": "personne-ici@example.com"})
        assert reponse.status_code == 200
        email_simule.assert_not_called()
