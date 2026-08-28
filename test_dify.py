"""
test_dify.py

Petit script pour tester le workflow Dify publie, sans passer par FastAPI.
Usage :
    python test_dify.py
"""

import json
import requests

# Remplace par ta vraie cle API Dify (celle de ton .env, DIFY_API_KEY)
DIFY_API_KEY = "app-As2rqM3kpEOjvWTPVVxl193O"
DIFY_API_URL = "https://api.dify.ai/v1"


def tester_recommandation():
    payload = {
        "inputs": {
            "action": "recommandation",
            "profession": "Enseignant",
            "projet": "Achat",
            "revenu": 300000,
            "charges": 50000,
            "apport": 10000,
            "taux_endettement": 25,
            "offres": json.dumps([{"nom_banque": "Credit Scolaire", "taeg": 8.5}]),
        },
        "response_mode": "blocking",
        "user": "test-claire",
    }

    response = requests.post(
        f"{DIFY_API_URL}/workflows/run",
        headers={
            "Authorization": f"Bearer {DIFY_API_KEY}",
            "Content-Type": "application/json",
        },
        json=payload,
    )

    print("Status code :", response.status_code)
    print("Reponse brute :")
    print(json.dumps(response.json(), indent=2, ensure_ascii=False))


def tester_explication_clause():
    payload = {
        "inputs": {
            "action": "explication_clause",
            "clause_texte": "En cas de remboursement anticipe, une indemnite de 3% du capital restant du sera appliquee.",
        },
        "response_mode": "blocking",
        "user": "test-claire",
    }

    response = requests.post(
        f"{DIFY_API_URL}/workflows/run",
        headers={
            "Authorization": f"Bearer {DIFY_API_KEY}",
            "Content-Type": "application/json",
        },
        json=payload,
    )

    print("Status code :", response.status_code)
    print("Reponse brute :")
    print(json.dumps(response.json(), indent=2, ensure_ascii=False))


if __name__ == "__main__":
    print("=== Test recommandation ===")
    tester_recommandation()
    print()
    print("=== Test explication clause ===")
    tester_explication_clause()