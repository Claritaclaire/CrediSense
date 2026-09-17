"""
Tests de non-regression pour la fiabilite des reponses IA (Dify/Groq + fallback local).

Ces cas sont bases sur de vraies reponses invalides retrouvees dans la table
MessageIA en base (raisonnement interne du modele qui fuite en anglais, faute
d'une balise <think> refermee avant la coupure de la generation).
"""

from app.services.dify_service import _nettoyer_reponse_ia, _reponse_semble_invalide
from app.services.claude_service import repondre_assistant_locale


# --- Reponses reelles (tronquees) retrouvees en base, avec balise <think> non refermee ---

REPONSE_NON_FERMEE = (
    "<think>\nThe user provided a prompt. The user has given a profile but with "
    "placeholders: Profession, Projet, Revenu mensuel, Charges mensuelles. So we "
    "have no data to analyze. We need to respond appropriately."
)

REPONSE_ANGLAISE_SANS_BALISE = (
    "Okay, let's tackle this query. The user provided a clause from a credit "
    "contract that just says \"hi\" and wants me to explain it in simple French."
)

REPONSE_VALIDE = (
    "Pour votre projet, l'offre la plus avantageuse est Credit Scolaire, avec un "
    "TAEG de 13.83 % et une mensualite de 105 582 FCFA."
)


def test_nettoyage_supprime_balise_think_fermee():
    brut = "<think>raisonnement interne</think>Voici votre reponse en francais."
    assert _nettoyer_reponse_ia(brut) == "Voici votre reponse en francais."


def test_nettoyage_supprime_balise_think_non_fermee():
    # Cas reel : le modele est coupe avant de refermer sa balise de raisonnement.
    nettoye = _nettoyer_reponse_ia(REPONSE_NON_FERMEE)
    assert nettoye == ""


def test_detection_invalide_sur_reponse_vide_apres_nettoyage():
    nettoye = _nettoyer_reponse_ia(REPONSE_NON_FERMEE)
    assert _reponse_semble_invalide(nettoye) is True


def test_detection_invalide_sur_raisonnement_sans_balise():
    # Cas reel : fuite de raisonnement en anglais, jamais entouree de <think>.
    assert _reponse_semble_invalide(REPONSE_ANGLAISE_SANS_BALISE) is True


def test_reponse_valide_non_signalee_comme_invalide():
    assert _reponse_semble_invalide(REPONSE_VALIDE) is False


def test_fallback_assistant_avec_revenu_donne_une_estimation():
    reponse = repondre_assistant_locale("Quelle est ma capacite si je gagne 300000 FCFA ?")
    assert "quotité cessible" in reponse.lower() or "quotite cessible" in reponse.lower()
    assert reponse.strip() != ""


def test_fallback_assistant_sans_revenu_redirige_vers_call_center():
    reponse = repondre_assistant_locale("Bonjour, comment ca marche ?")
    assert "679 00 96 30" in reponse
