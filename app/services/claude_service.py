import json

from anthropic import Anthropic

from app.config import settings


def _get_client():
    """Initialisation lazy du client Anthropic."""
    return Anthropic(
        api_key=settings.anthropic_api_key,
        timeout=settings.anthropic_timeout_seconds,
    )


def _extraire_texte_reponse(message) -> str:
    contenu = getattr(message, "content", message)

    if isinstance(contenu, str):
        texte_stream = _extraire_texte_stream_sse(contenu)
        return texte_stream or contenu

    morceaux = []
    for bloc in contenu:
        if isinstance(bloc, str):
            morceaux.append(bloc)
            continue

        texte = getattr(bloc, "text", None)
        if texte:
            morceaux.append(texte)

    reponse = "\n".join(morceaux).strip()
    if not reponse:
        raise RuntimeError("Anthropic a renvoyé une réponse vide ou non textuelle.")
    return reponse


def _extraire_texte_stream_sse(contenu: str) -> str:
    if "event:" not in contenu or "data:" not in contenu:
        return ""

    morceaux = []
    for segment in contenu.split("event:"):
        if "data:" not in segment:
            continue

        payload = segment.split("data:", 1)[1].strip()
        try:
            evenement = json.loads(payload)
        except json.JSONDecodeError:
            continue

        if evenement.get("type") != "content_block_delta":
            continue

        delta = evenement.get("delta", {})
        if delta.get("type") == "text_delta":
            morceaux.append(delta.get("text", ""))

    return "".join(morceaux).strip()


def _formater_fcfa(valeur: float) -> str:
    return f"{valeur:,.0f}".replace(",", " ")


def _semble_contenir_raisonnement(reponse: str) -> bool:
    marqueurs = (
        "We need",
        "Let's craft",
        "Compute",
        "Debt ratio",
        "The first entry",
        "Provide in French",
        "instructions",
        "So we",
    )
    return any(marqueur.lower() in reponse.lower() for marqueur in marqueurs)


def generer_recommandation_locale(profil: dict, offres_simulees: list[dict]) -> str:
    if not offres_simulees:
        return (
            "Aucune offre disponible ne correspond au montant et à la durée demandés. "
            "Essayez de réduire le montant, de modifier la durée ou de consulter une autre offre."
        )

    meilleure = offres_simulees[0]
    selectionnee = next(
        (offre for offre in offres_simulees if offre.get("offre_selectionnee")),
        None,
    )
    revenu = profil.get("revenu_mensuel") or 0
    charges_fixes = profil.get("charges_mensuelles") or 0
    prets_existants = profil.get("total_mensualites_prets_en_cours") or 0
    mensualite_totale = charges_fixes + prets_existants + meilleure["mensualite"]

    taux_endettement_global = (
        mensualite_totale / revenu * 100
        if revenu > 0
        else None
    )

    projet = profil.get("projet")
    mention_projet = f" Pour votre projet ({projet}), l" if projet else " L'"
    
    intro = (
        f"{mention_projet.capitalize()}offre la plus avantageuse est {meilleure['nom_banque']}, avec un TAEG de "
        f"{meilleure['taeg']:.2f} %, une mensualité de {_formater_fcfa(meilleure['mensualite'])} FCFA "
        f"et un coût total de {_formater_fcfa(meilleure['cout_total'])} FCFA."
    )

    if selectionnee and selectionnee["offre_id"] != meilleure["offre_id"]:
        comparaison = (
            f"Votre choix actuel, {selectionnee['nom_banque']}, est moins intéressant car son TAEG "
            f"est de {selectionnee['taeg']:.2f} % et son coût total est de "
            f"{_formater_fcfa(selectionnee['cout_total'])} FCFA."
        )
    else:
        comparaison = "Votre choix correspond à l'offre la plus compétitive parmi les offres éligibles."

    if taux_endettement_global is None:
        endettement = "Renseignez un revenu mensuel valide pour vérifier le taux d'endettement global."
    elif taux_endettement_global > 33:
        endettement = (
            f"Attention toutefois : en incluant vos charges fixes et vos crédits en cours, la nouvelle mensualité porterait votre taux d'endettement global à environ {taux_endettement_global:.1f} %, "
            "ce qui dépasse le seuil recommandé de 33 %."
        )
    else:
        endettement = (
            f"En prenant en compte vos charges et crédits actuels, votre taux d'endettement global sera d'environ {taux_endettement_global:.1f} %, "
            "ce qui reste sous le seuil recommandé de 33 %."
        )

    return " ".join([intro, comparaison, endettement])


def expliquer_clause_locale(texte_clause: str) -> str:
    """Explication de secours quand le service IA externe est indisponible."""
    clause = " ".join(texte_clause.split()).strip()
    clause_minuscule = clause.lower()

    if any(mot in clause_minuscule for mot in ("retard", "impay", "échéance")):
        return (
            "Cette clause précise ce qui se passe si une mensualité est payée en retard : "
            "des frais ou intérêts supplémentaires peuvent s'ajouter. Veillez à payer à la date prévue "
            "et contactez la banque rapidement si vous anticipez une difficulté."
        )
    if any(mot in clause_minuscule for mot in ("assurance", "assuré")):
        return (
            "Cette clause concerne l'assurance liée au crédit. Elle peut prendre en charge certaines "
            "situations prévues au contrat ; vérifiez les garanties, exclusions et le montant de la cotisation."
        )
    if any(mot in clause_minuscule for mot in ("remboursement anticipé", "rembourser par anticipation")):
        return (
            "Cette clause explique les conditions pour rembourser le crédit avant la fin prévue. "
            "Demandez à la banque le montant restant dû et les éventuels frais avant de prendre votre décision."
        )
    if any(mot in clause_minuscule for mot in ("frais", "commission", "pénalité")):
        return (
            "Cette clause décrit des frais qui peuvent s'ajouter au crédit dans les situations prévues par le contrat. "
            "Vérifiez leur montant, leur fréquence et les conditions qui déclenchent leur application."
        )

    return (
        "Cette clause fixe une règle applicable à votre crédit et les conséquences si elle n'est pas respectée. "
        "Lisez-la avec attention et demandez à la banque de préciser tout point qui reste ambigu avant de signer."
    )


def generer_recommandation(profil: dict, offres_simulees: list[dict]) -> str:
    """
    Envoie le profil complet de l'utilisateur, son projet et les résultats de simulation à Claude,
    pour obtenir un conseil personnalisé et argumenté.
    """
    projet_str = profil.get("projet") or "Non précisé"
    profession_str = profil.get("profession") or "Non précisée"
    charges_fixes = profil.get("charges_mensuelles") or 0
    prets_existants = profil.get("total_mensualites_prets_en_cours") or 0

    prompt = f"""Réponds directement au client final. N'écris jamais ton raisonnement, tes calculs intermédiaires, ni des phrases en anglais.

Voici les informations complètes du client :
- Projet / Objet du crédit : {projet_str}
- Profession / Statut professionnel : {profession_str}
- Revenu mensuel : {profil['revenu_mensuel']} FCFA
- Charges fixes mensuelles (hors crédit) : {charges_fixes} FCFA
- Mensualités de crédits déjà en cours : {prets_existants} FCFA
- Apport disponible : {profil['apport']} FCFA
- Montant du nouveau crédit souhaité : {profil['montant_souhaite']} FCFA
- Durée souhaitée : {profil['duree_mois']} mois
- Offre choisie par le client : {profil.get('offre_id') or 'non précisée'}

Voici les offres simulées, triées par TAEG croissant : {offres_simulees}

Consignes d'analyse banquaires CCA Bank :
1. Prends en compte l'objectif du projet ({projet_str}) et la situation globale du client.
2. Recommande l'offre financièrement la plus avantageuse (ex: Crédit Scolaire & Universitaire max 11 mois, ou Découvert sur salaire à 50% max du net).
3. Évalue le TAUX D'ENDETTEMENT GLOBAL = (Charges fixes + Prêts en cours + Nouvelle mensualité) / Revenu mensuel (seuil recommandé : 33%).
4. Rappelle brièvement les pièces clés nécessaires selon son statut (Fonctionnaire : AVI, CNI, billet à ordre, NIU ; Salarié Privé : Attestation de présence effective, attestation de virement, fiche NSIA).
5. Réponds en français simple, professionnel et bienveillant, en 3 à 4 phrases complètes maximum, sans liste à puces."""

    message = _get_client().messages.create(
        model=settings.anthropic_model,
        max_tokens=450,
        system="Tu es un conseiller financier expert de la CCA Bank. Tu ne dois produire que la réponse finale au client en français, sans raisonnement interne.",
        messages=[{"role": "user", "content": prompt}],
    )
    reponse = _extraire_texte_reponse(message)
    if _semble_contenir_raisonnement(reponse):
        return generer_recommandation_locale(profil, offres_simulees)
    return reponse


def expliquer_clause(texte_clause: str) -> str:
    """Reformule une clause contractuelle en langage simple."""
    prompt = f"""Voici une clause d'un contrat de crédit :

"{texte_clause}"

Explique cette clause en français simple et accessible, sans jargon juridique,
en 2-3 phrases maximum, à destination d'un client qui n'est pas familier
avec le vocabulaire bancaire."""

    message = _get_client().messages.create(
        model=settings.anthropic_model,
        max_tokens=220,
        messages=[{"role": "user", "content": prompt}],
    )
    return _extraire_texte_reponse(message)
