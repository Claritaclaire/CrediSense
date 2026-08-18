"""
Module de calculs financiers pour le simulateur de crédit.

Ce module est volontairement indépendant de FastAPI et de la base de données :
il ne contient que des fonctions pures Python, testables isolément.
Aucune de ces fonctions ne fait appel à une API externe (IA) ou à une DB.
"""

from scipy.optimize import brentq


def calculer_mensualite(capital: float, taux_annuel: float, duree_mois: int) -> float:
    """
    Calcule la mensualité d'un crédit à taux fixe (amortissement constant).

    :param capital: montant emprunté (FCFA)
    :param taux_annuel: taux nominal annuel (ex. 0.145 pour 14,5%)
    :param duree_mois: durée du prêt en mois
    :return: mensualité arrondie à 2 décimales
    """
    if capital <= 0 or duree_mois <= 0:
        raise ValueError("Le capital et la durée doivent être strictement positifs.")

    if taux_annuel == 0:
        # Cas particulier : crédit sans intérêt
        return round(capital / duree_mois, 2)

    taux_mensuel = taux_annuel / 12
    mensualite = capital * taux_mensuel / (1 - (1 + taux_mensuel) ** (-duree_mois))
    return round(mensualite, 2)


def generer_tableau_amortissement(capital: float, taux_annuel: float, duree_mois: int) -> list[dict]:
    """
    Génère le tableau d'amortissement mois par mois.

    Le dernier mois est ajusté pour que le capital restant tombe exactement
    à zéro (correction des écarts d'arrondis cumulés).

    :return: liste de dictionnaires, un par mois
    """
    taux_mensuel = taux_annuel / 12
    mensualite = calculer_mensualite(capital, taux_annuel, duree_mois)

    tableau = []
    capital_restant = round(capital, 2)

    for mois in range(1, duree_mois + 1):
        capital_restant_debut = capital_restant
        interets = round(capital_restant_debut * taux_mensuel, 2)

        if mois < duree_mois:
            part_capital = round(mensualite - interets, 2)
            capital_restant = round(capital_restant_debut - part_capital, 2)
            mensualite_du_mois = mensualite
        else:
            # Dernier mois : on solde exactement le capital restant,
            # pour éviter un résidu du type "0.73 FCFA" dû aux arrondis successifs.
            part_capital = capital_restant_debut
            mensualite_du_mois = round(part_capital + interets, 2)
            capital_restant = 0.0

        tableau.append({
            "mois": mois,
            "capital_restant_debut": capital_restant_debut,
            "interets": interets,
            "part_capital": part_capital,
            "mensualite": mensualite_du_mois,
            "capital_restant_fin": capital_restant,
        })

    return tableau


def calculer_cout_total(tableau_amortissement: list[dict], frais_dossier: float,
                          assurance_mensuelle: float) -> float:
    """
    Calcule le coût total du crédit : somme des mensualités + frais de dossier
    + assurance cumulée sur toute la durée.
    """
    total_mensualites = sum(m["mensualite"] for m in tableau_amortissement)
    duree_mois = len(tableau_amortissement)
    total_assurance = assurance_mensuelle * duree_mois
    return round(total_mensualites + frais_dossier + total_assurance, 2)


def calculer_taeg(capital: float, mensualite: float, duree_mois: int,
                    frais_dossier: float, assurance_mensuelle: float) -> float:
    """
    Calcule le TAEG (Taux Annuel Effectif Global) par résolution numérique.

    Le TAEG est le taux qui égalise la valeur actualisée des flux payés
    par l'emprunteur avec le capital net perçu (capital - frais de dossier,
    ceux-ci étant prélevés immédiatement).

    :return: TAEG en pourcentage (ex. 15.62 pour 15,62%)
    """
    flux_mensuel = mensualite + assurance_mensuelle
    capital_net = capital - frais_dossier

    def equation_taeg(taux_annuel: float) -> float:
        taux_periode = taux_annuel / 12
        valeur_actuelle = sum(
            flux_mensuel / (1 + taux_periode) ** mois
            for mois in range(1, duree_mois + 1)
        )
        return valeur_actuelle - capital_net

    # Recherche du taux entre 0,1% et 200% (large marge de sécurité)
    taeg = brentq(equation_taeg, 0.001, 2.0)
    return round(taeg * 100, 2)


def simuler_credit(capital: float, taux_annuel: float, duree_mois: int,
                     frais_dossier_pct: float, assurance_pct_an: float) -> dict:
    """
    Fonction principale : orchestre les 4 calculs pour produire une simulation complète.

    :param frais_dossier_pct: ex. 0.015 pour 1,5% du capital
    :param assurance_pct_an: ex. 0.004 pour 0,4% par an du capital initial
    :return: dictionnaire de synthèse (mensualité, TAEG, coût total, tableau complet)
    """
    frais_dossier = round(capital * frais_dossier_pct, 2)
    assurance_mensuelle = round(capital * assurance_pct_an / 12, 2)

    mensualite = calculer_mensualite(capital, taux_annuel, duree_mois)
    tableau = generer_tableau_amortissement(capital, taux_annuel, duree_mois)
    cout_total = calculer_cout_total(tableau, frais_dossier, assurance_mensuelle)
    taeg = calculer_taeg(capital, mensualite, duree_mois, frais_dossier, assurance_mensuelle)

    return {
        "capital": capital,
        "taux_annuel": taux_annuel,
        "duree_mois": duree_mois,
        "mensualite": mensualite,
        "frais_dossier": frais_dossier,
        "assurance_mensuelle": assurance_mensuelle,
        "cout_total": cout_total,
        "taeg": taeg,
        "tableau_amortissement": tableau,
    }
