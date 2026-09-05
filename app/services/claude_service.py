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
        mensualite_max_disponible = profil.get("mensualite_maximale_disponible")
        if mensualite_max_disponible is not None:
            return (
                f"Aucune offre ne respecte votre quotité cessible : après vos charges et crédits en cours, "
                f"votre mensualité disponible est de {_formater_fcfa(mensualite_max_disponible)} FCFA. "
                "Réduisez le montant demandé, choisissez une durée plus longue ou consultez votre conseiller."
            )
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
    mensualite_max_disponible = profil.get("mensualite_maximale_disponible") or 0
    mensualite_totale = charges_fixes + prets_existants + meilleure.get("mensualite_complete", meilleure["mensualite"])

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

    quotite = (
        f" La mensualité complète reste sous votre quotité disponible de {_formater_fcfa(mensualite_max_disponible)} FCFA."
        if mensualite_max_disponible is not None
        else ""
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
            f"Attention toutefois : en incluant vos charges fixes, vos crédits en cours et l'assurance, le taux d'endettement global serait d'environ {taux_endettement_global:.1f} %."
        )
    else:
        endettement = (
            f"En prenant en compte vos charges, vos crédits actuels et l'assurance, votre taux d'endettement global serait d'environ {taux_endettement_global:.1f} %."
        )

    return " ".join([intro + quotite, comparaison, endettement])


def expliquer_clause_locale(texte_clause: str) -> str:
    """Explication de secours structurée quand le service IA externe est indisponible."""
    clause = " ".join(texte_clause.split()).strip()
    clause_minuscule = clause.lower()

    if any(mot in clause_minuscule for mot in ("retard", "impay", "échéance")):
        signification = "Cette clause fixe les sanctions financières s'il y a un retard ou un défaut de remboursement à l'échéance convenue."
        risques = "Des pénalités et intérêts de retard viendront augmenter le coût total de votre prêt. En cas d'impayés répétés, le contrat peut être résilié et entraîner une inscription aux fichiers des incidents de paiement."
        conseil = "Respectez scrupuleusement vos dates d'échéance. En cas d'imprévu financier, contactez votre conseiller CCA Bank avant la date de prélèvement."

    elif any(mot in clause_minuscule for mot in ("domicili", "virement", "salaire", "avi")):
        signification = "Cette clause vous engagerait à faire verser directement et irrévocablement votre salaire ou vos revenus sur votre compte ouvert à la CCA Bank pendant toute la durée du crédit."
        risques = "Vous ne pourrez pas modifier le compte de prélèvement de vos revenus sans l'accord préalable écrit de la banque."
        conseil = "Assurez-vous de la faisabilité de cette domiciliation avec votre employeur avant la signature du contrat (Attestation de Virement Irrévocable)."

    elif any(mot in clause_minuscule for mot in ("déchéance", "résiliation", "exigibilité")):
        signification = "Cette clause permet à la banque d'exiger le remboursement immédiat de la totalité du capital restant dû sans attendre la fin initiale du prêt."
        risques = "Cette sanction est déclenchée en cas de fausse déclaration, de défaut d'assurance ou de non-paiement prolongé. Vous devriez alors régler tout le solde sous court délai."
        conseil = "Fournissez des informations sincères dès le départ et prévenez la banque au moindre changement important de situation."

    elif any(mot in clause_minuscule for mot in ("assurance", "assuré", "décès", "invalidité")):
        signification = "Cette clause impose la souscription d'une assurance pour couvrir les risques d'incapacité, de décès ou d'invalidité pendant le remboursement."
        risques = "En cas de sinistre garanti, l'assureur prend en charge tout ou partie des mensualités restantes. Si vous manquez à vos cotisations, la couverture s'arrête."
        conseil = "Lisez attentivement la notice d'information de l'assurance pour connaître les délais de carence, les franchises et les exclusions."

    elif any(mot in clause_minuscule for mot in ("remboursement anticipé", "rembourser par anticipation")):
        signification = "Cette clause stipule les conditions et modalités pour rembourser votre prêt plus tôt que prévu, en partie ou en totalité."
        risques = "Des indemnités de remboursement anticipé peuvent être perçues par la banque pour compenser le manque à gagner sur les intérêts futurs."
        conseil = "Avant tout versement anticipé, demandez un décompte d'arrêté de compte à la CCA Bank pour vérifier s'il est plus avantageux de solder le prêt."

    elif any(mot in clause_minuscule for mot in ("taux", "variation", "beac", "révisable", "variable")):
        signification = "Cette clause indique que le taux d'intérêt de votre crédit n'est pas fixe et peut évoluer selon la conjoncture monétaire (taux directeurs BEAC)."
        risques = "Si les taux augmentent, votre mensualité ou la durée de remboursement pourra augmenter, renchérissant le coût global du crédit."
        conseil = "Privilégiez les crédits à taux fixe si vous souhaitez préserver la stabilité exacte de votre budget mensuel."

    else:
        signification = "Cette clause définit une obligation ou une règle spécifique encadrant la relation contractuelle entre l'emprunteur et la banque."
        risques = "Le non-respect des engagements prévus par cette clause peut donner lieu à des frais administratifs ou à un litige contractuel."
        conseil = "En cas de doute sur la portée exacte d'un terme contractuel, demandez une explication écrite et détaillée à votre conseiller CCA Bank."

    return f"**1. Que signifie cette clause ?**\n{signification}\n\n**2. Impacts et risques pour l'emprunteur**\n{risques}\n\n**3. Conseil bancaire CCA Bank**\n{conseil}"


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
- Quotité cessible légale totale : {quotite_totale} FCFA
- Mensualité maximale disponible après charges et prêts : {mensualite_max_disponible} FCFA
- Apport disponible : {profil['apport']} FCFA
- Montant du nouveau crédit souhaité : {profil['montant_souhaite']} FCFA
- Durée souhaitée : {profil['duree_mois']} mois
- Offre choisie par le client : {profil.get('offre_id') or 'non précisée'}

Voici les offres simulées, triées par TAEG croissant : {offres_simulees}

Consignes d'analyse banquaires CCA Bank :
1. Prends en compte l'objectif du projet ({projet_str}) et la situation globale du client.
2. Recommande uniquement une offre dont la mensualité complète (mensualité + assurance) ne dépasse pas la mensualité maximale disponible selon la quotité cessible.
3. Vérifie que la mensualité complète (mensualité + assurance) respecte la mensualité maximale disponible calculée avec la quotité cessible légale. Présente aussi le taux d'endettement global à titre informatif.
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
    """Reformule une clause contractuelle en langage simple et structuré."""
    prompt = f"""Voici une clause d'un contrat de crédit :

"{texte_clause}"

Analyse et explique cette clause en français simple pour un client non-juriste.
Structure ta réponse EXACTEMENT selon ces 3 points :

**1. Que signifie cette clause ?**
(1-2 phrases explicatives en langage très accessible)

**2. Impacts et risques pour l'emprunteur**
(1-2 phrases sur les conséquences financières ou engagements)

**3. Conseil bancaire CCA Bank**
(1 conseil pratique pour le client)"""

    message = _get_client().messages.create(
        model=settings.anthropic_model,
        max_tokens=350,
        messages=[{"role": "user", "content": prompt}],
    )
    return _extraire_texte_reponse(message)

