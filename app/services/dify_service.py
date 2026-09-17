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
import re
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

DIFY_API_KEY = settings.dify_api_key
DIFY_API_URL = settings.dify_api_url.rstrip("/")
DIFY_TIMEOUT_SECONDS = 15.0  # a ajuster selon la latence observee avec Groq


_MARQUEURS_RAISONNEMENT = (
    "we need", "let's", "let us", "compute", "debt ratio", "the first entry",
    "provide in french", "instructions", "so we", "i need", "okay,", "step 1",
    "the user ", "according to",
)


def _nettoyer_reponse_ia(texte: str) -> str:
    """Supprime le raisonnement interne éventuellement renvoyé par le modèle."""
    texte = re.sub(r"<think>.*?</think>", "", texte, flags=re.IGNORECASE | re.DOTALL)
    texte = re.sub(r"<thinking>.*?</thinking>", "", texte, flags=re.IGNORECASE | re.DOTALL)
    # Le modele peut etre coupe avant de refermer sa balise de raisonnement
    # (limite de tokens atteinte) : dans ce cas la balise ouvrante n'a pas de
    # fermeture et le regex ci-dessus ne retire rien. On supprime alors tout
    # ce qui suit une balise ouvrante non refermee.
    texte = re.sub(r"<think(?:ing)?>.*", "", texte, flags=re.IGNORECASE | re.DOTALL)
    return texte.strip()


def _reponse_semble_invalide(texte: str) -> bool:
    """Detecte un raisonnement interne qui aurait fui sans balise (ou une reponse vide)."""
    texte_nettoye = texte.strip()
    if len(texte_nettoye) < 15:
        return True
    texte_minuscule = texte_nettoye.lower()
    return any(marqueur in texte_minuscule for marqueur in _MARQUEURS_RAISONNEMENT)


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
    # Toutes les variables du noeud START sont declarees en type "text-input"
    # (texte) cote Dify, meme les valeurs numeriques (revenu, charges, etc.) :
    # Dify les rejette avec une erreur 400 si on envoie un int/float/None au lieu
    # d'une chaine. On uniformise ici, en un seul endroit, plutot que de le faire
    # au coup par coup dans chaque fonction (et de l'oublier a la prochaine variable).
    inputs_texte = {cle: ("" if valeur is None else str(valeur)) for cle, valeur in inputs.items()}
    payload = {
        "inputs": inputs_texte,
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
        reponse = (
            outputs.get("answer")
            or outputs.get("text")
            or outputs.get("reasoning_content")
            or next(iter(outputs.values()))
        )
        reponse_nettoyee = _nettoyer_reponse_ia(str(reponse))
        if _reponse_semble_invalide(reponse_nettoyee):
            logger.warning("Reponse Dify invalide ou raisonnement non filtre: %s", reponse)
            raise DifyServiceError("Reponse Dify invalide (raisonnement interne non filtre)")
        return reponse_nettoyee
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
        round(((charges + prets_en_cours + mensualite_recommandee) / revenu) * 100, 1)
        if revenu > 0
        else None
    )
    # Seuil d'alerte base sur le taux effectif de la quotite cessible legale
    # (bareme progressif de calculs_financiers.py), pas un seuil fixe de 33 % :
    # c'est la meme regle que celle utilisee pour filtrer les offres compatibles
    # (compatible_quotite), juste exprimee en pourcentage du revenu plutot qu'en FCFA.
    taux_quotite_effectif = data.get("taux_quotite_effectif_pct") or 0
    depassement_seuil = (
        "oui" if taux_endettement is not None and taux_endettement > taux_quotite_effectif else "non"
    )
    offres_compatibles = [
        offre for offre in offres_simulees
        if offre.get("compatible_quotite", True)
    ]
    offres_exclues = [
        offre for offre in offres_simulees
        if offre.get("compatible_quotite") is False
    ]

    # profil_json ne doit contenir QUE ce qui n'est pas deja envoye comme variable
    # individuelle (revenu, charges, apport, profession, projet, etc. le sont deja
    # ci-dessous) : le nœud START limite ce champ a 256 caracteres, et le dupliquer
    # avec profession/projet en texte libre suffisait a depasser la limite.
    # L'ID brut de l'offre selectionnee n'est plus envoye : chaque offre de
    # offres_compatibles/offres_exclues porte deja un booleen "offre_selectionnee",
    # suffisant pour que le modele sache laquelle comparer, sans exposer un UUID
    # technique que le modele recopiait telle quelle dans sa reponse.
    profil = {}

    inputs = {
        "action": "recommandation",
        "profession": data.get("profession") or "",
        "projet": data.get("projet") or "",
        "revenu": revenu,
        "charges": charges,
        "prets_en_cours": prets_en_cours,
        "apport": data.get("apport", 0),
        "montant_souhaite": data.get("montant_souhaite", 0),
        "duree_mois": data.get("duree_mois", 0),
        "taux_endettement": taux_endettement,
        "depassement_seuil": depassement_seuil,
        "quotite_cessible_totale": quotite_totale,
        "mensualite_maximale_disponible": mensualite_max_disponible,
        "offres_compatibles": json.dumps(offres_compatibles, ensure_ascii=False),
        "offres_exclues": json.dumps(offres_exclues, ensure_ascii=False),
        "regles_metier": (
            "Recommande TOUJOURS l'offre en première position dans offres_compatibles : "
            "cette liste est déjà triée par TAEG croissant et déjà filtrée par compatibilité "
            "avec la quotité cessible, c'est la seule règle de choix valide. Ne recommande "
            "jamais une offre exclue. N'invente et n'utilise JAMAIS de correspondance entre le "
            "nom d'une offre (Scolaire, Urgence, Commercial, Découvert, Projet Personnel...) et "
            "le projet du client (achat véhicule, immobilier, etc.) : cette application n'a "
            "aucune règle métier associant un type de projet à un nom d'offre, seuls le TAEG et "
            "la compatibilité avec la quotité cessible comptent. Toutes les sommes sont en FCFA, "
            "jamais en euros ni dans une autre devise. Ne mentionne jamais d'identifiant "
            "technique (ID, UUID) d'une offre dans ta réponse : utilise uniquement son nom. "
            "Il n'existe qu'une seule banque dans cette application : CCA Bank. Le champ "
            "nom_banque désigne le NOM DU PRODUIT DE CRÉDIT (l'offre), pas le nom d'une autre "
            "banque : ne dis jamais « la banque CCT » ou « la banque Scolaire » par exemple. "
            "Dis « l'offre CCT Fonctionnaire de CCA Bank » ou simplement « cette offre », et "
            "réserve « la banque » pour désigner CCA Bank elle-même. "
            "La mensualité complète comprend la "
            "mensualité et l'assurance et doit être inférieure ou égale à la mensualité maximale "
            "disponible. Utilise le revenu, les charges, les prêts en cours et la quotité "
            "cessible fournis par le backend. Ne fabrique aucun taux, montant, plafond ou "
            "condition. Si aucune offre compatible n'est disponible, explique-le clairement et "
            "conseille de réduire le montant ou d'augmenter la durée. Réponds en français, en "
            "3 à 4 phrases maximum."
        ),
        "profil_json": json.dumps(profil, ensure_ascii=False),
        "offres": json.dumps(offres_simulees, ensure_ascii=False),
    }
    return _call_dify_workflow(inputs)


def expliquer_clause(texte_clause: str) -> str:
    """Meme signature que claude_service.expliquer_clause."""
    # Le workflow Dify ne declare pas de variable dediee aux consignes de
    # format pour cette action (contrairement a "recommandation" qui recoit
    # regles_metier) : on les glisse donc dans le seul champ d'entree connu
    # plutot que d'ajouter une cle non declaree qui serait ignoree.
    clause_avec_consignes = (
        f'Clause : "{texte_clause}"\n\n'
        "Consignes : reponds uniquement en francais simple, sans jamais montrer de "
        "raisonnement interne ni de phrase en anglais. Structure la reponse en "
        "3 points : (1) ce que signifie la clause, (2) impacts et risques pour "
        "l'emprunteur, (3) un conseil bancaire CCA Bank. 4 phrases maximum au total."
    )
    inputs = {
        "action": "explication_clause",
        "clause_texte": clause_avec_consignes,
    }
    return _call_dify_workflow(inputs)


def repondre_assistant(question: str, page: str | None = None, historique: list | None = None) -> str:
    """Envoie une question generale sur l'application au workflow Dify.

    L'API Workflow de Dify est sans etat (contrairement a l'API Chat, qui gere un
    conversation_id) : chaque appel est independant. Pour que l'assistant tienne compte
    des echanges precedents, on reconstitue un court historique dans le texte envoye,
    plutot que de migrer vers une app Dify de type Chat (plus gros chantier).
    """
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

    # Le champ "question" du noeud START semble limite a 256 caracteres (meme
    # contrainte que profil_json). On degrade progressivement plutot que de faire
    # echouer l'appel : on retire d'abord les plus anciens echanges de l'historique,
    # puis, en dernier recours, on tronque la question elle-meme.
    LIMITE_CARACTERES = 250  # marge de securite sous la limite Dify de 256

    def _construire_texte(nb_echanges: int) -> str:
        contexte = ""
        if historique:
            derniers = historique[-nb_echanges:] if nb_echanges > 0 else []
            if derniers:
                lignes = [f"{'Client' if m.role == 'user' else 'Assistant'} : {m.contenu}" for m in derniers]
                contexte = "Historique :\n" + "\n".join(lignes) + "\n\n"
        return f"{contexte}Page : {page or '/'}\nQuestion : {question}"

    texte = _construire_texte(6)
    for nb_echanges in (4, 2, 1, 0):
        if len(texte) <= LIMITE_CARACTERES:
            break
        texte = _construire_texte(nb_echanges)
    if len(texte) > LIMITE_CARACTERES:
        # Meme sans historique, la question seule depasse la limite : on la tronque.
        texte = texte[:LIMITE_CARACTERES]

    inputs = {
        "action": "assistant",
        "question": texte,
        "profil_json": json.dumps(profil, ensure_ascii=False),
        "montant_souhaite": 0,
        "prets_en_cours": "0",
        "duree_mois": 0,
    }
    return _call_dify_workflow(inputs)