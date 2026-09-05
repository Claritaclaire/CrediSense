"""
app/services/dify_service.py

Service d'appel au workflow Dify unique (action = recommandation | explication_clause).
Memes signatures que app/services/claude_service.py pour un remplacement a l'identique
dans app/routers/ia.py : generer_recommandation(data, offres_simulees) et
expliquer_clause(texte_clause). Les fonctions *_locale restent dans claude_service.py
et servent toujours de fallback dans le router.

Variables d'environnement attendues dans .env :
    DIFY_API_KEY=app-As2rqM3kpEOjvWTPVVxl193O
    DIFY_API_URL=https://api.dify.ai/v1
"""

import logging
import json
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

DIFY_API_KEY = settings.dify_api_key
DIFY_API_URL = settings.dify_api_url.rstrip("/")
DIFY_TIMEOUT_SECONDS = 15.0  # a ajuster selon la latence observee avec Groq


class DifyServiceError(Exception):
    """Levee quand l'appel au workflow Dify echoue. Le router catch Exception et
    bascule sur le mode local, donc cette exception remonte simplement comme les
    anciennes exceptions Anthropic."""


def _call_dify_workflow(inputs: dict[str, Any]) -> str:
    if not DIFY_API_KEY:
        raise DifyServiceError("DIFY_API_KEY n'est pas configuree dans l'environnement.")

    url = f"{DIFY_API_URL}/workflows/run"
    headers = {
        "Authorization": f"Bearer {DIFY_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "inputs": inputs,
        "response_mode": "blocking",
        "user": "credisense-backend",
    }

    try:
        with httpx.Client(timeout=DIFY_TIMEOUT_SECONDS) as client:
            response = client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
    except httpx.TimeoutException as exc:
        logger.warning("Timeout lors de l'appel au workflow Dify: %s", exc)
        raise DifyServiceError("Timeout Dify") from exc
    except httpx.HTTPStatusError as exc:
        logger.warning(
            "Erreur HTTP Dify (%s): %s", exc.response.status_code, exc.response.text
        )
        raise DifyServiceError(f"Erreur HTTP Dify {exc.response.status_code}") from exc
    except httpx.RequestError as exc:
        logger.warning("Erreur reseau lors de l'appel Dify: %s", exc)
        raise DifyServiceError("Erreur reseau Dify") from exc

    try:
        outputs = data["data"]["outputs"]
        # Les deux branches du workflow ne nomment pas leur variable de sortie
        # a l'identique (text pour la recommandation, reasoning_content pour
        # l'explication de clause) : on essaie les noms connus avant de
        # prendre la premiere valeur disponible en dernier recours.
        return (
            outputs.get("answer")
            or outputs.get("text")
            or outputs.get("reasoning_content")
            or next(iter(outputs.values()))
        )
    except (KeyError, StopIteration, AttributeError) as exc:
        logger.error("Reponse Dify inattendue: %s", data)
        raise DifyServiceError("Format de reponse Dify inattendu") from exc


def generer_recommandation(data: dict, offres_simulees: list) -> str:
    """
    Meme signature que claude_service.generer_recommandation.
    'data' est le dict issu de RecommandationRequest.model_dump(), 'offres_simulees'
    la liste deja triee par TAEG construite dans le router.
    """
    revenu = data.get("revenu_mensuel") or 0
    charges = data.get("charges_mensuelles") or 0
    prets_en_cours = data.get("total_mensualites_prets_en_cours") or 0
    quotite_totale = data.get("quotite_cessible_totale") or 0
    mensualite_max_disponible = data.get("mensualite_maximale_disponible") or 0
    mensualite_recommandee = (
        offres_simulees[0].get("mensualite_complete", offres_simulees[0].get("mensualite", 0)) if offres_simulees else 0
    )
    taux_endettement = (
        ((charges + prets_en_cours + mensualite_recommandee) / revenu) * 100
        if revenu > 0
        else None
    )

    profil = {
        "revenu_mensuel": revenu,
        "charges_mensuelles": charges,
        "mensualites_prets_en_cours": prets_en_cours,
        "montant_souhaite": data.get("montant_souhaite", 0),
        "duree_mois": data.get("duree_mois", 0),
        "apport": data.get("apport", 0),
        "profession": data.get("profession") or "",
        "projet": data.get("projet") or "",
        "offre_selectionnee_id": str(data.get("offre_id") or ""),
    }

    inputs = {
        "action": "recommandation",
        "profession": profil["profession"],
        "projet": profil["projet"],
        "revenu": revenu,
        "charges": charges,
        "prets_en_cours": prets_en_cours,
        "apport": profil["apport"],
        "montant_souhaite": profil["montant_souhaite"],
        "duree_mois": profil["duree_mois"],
        "taux_endettement": taux_endettement,
        "quotite_cessible_totale": quotite_totale,
        "mensualite_maximale_disponible": mensualite_max_disponible,
        "profil_json": json.dumps(profil, ensure_ascii=False),
        "offres": json.dumps(offres_simulees, ensure_ascii=False),
    }
    return _call_dify_workflow(inputs)


def expliquer_clause(texte_clause: str) -> str:
    """Meme signature que claude_service.expliquer_clause."""
    inputs = {
        "action": "explication_clause",
        "clause_texte": texte_clause,
    }
    return _call_dify_workflow(inputs)


def repondre_assistant(question: str, page: str | None = None) -> str:
    """Envoie une question generale sur l'application au workflow Dify."""
    profil = {
        "revenu_mensuel": 0,
        "charges_mensuelles": 0,
        "mensualites_prets_en_cours": 0,
        "montant_souhaite": 0,
        "duree_mois": 0,
        "apport": 0,
        "profession": "",
        "projet": "",
    }
    inputs = {
        "action": "assistant",
        "question": f"Page actuelle : {page or '/'}\nQuestion : {question}",
        "profil_json": json.dumps(profil, ensure_ascii=False),
        "montant_souhaite": 0,
        "prets_en_cours": "0",
        "duree_mois": 0,
    }
    return _call_dify_workflow(inputs)