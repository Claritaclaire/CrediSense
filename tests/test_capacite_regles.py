from fastapi.testclient import TestClient

from app.core.security import get_current_user
from app.main import app
from app.services.calculs_financiers import calculer_plafonds_mensualite


def test_regle_du_tiers_plus_stricte_pour_revenu_moyen():
    plafonds = calculer_plafonds_mensualite(300_000, 0, 0)

    assert plafonds["legal"]["base"] == 200_000
    assert plafonds["prudent"]["base"] == 100_000
    assert plafonds["tiers_plus_strict"] is True


def test_quotite_legale_plus_stricte_pour_petit_revenu():
    # Quotite legale de 60 000 : 1 875 + 3 750 + 5 625 = 11 250, sous le tiers (20 000).
    plafonds = calculer_plafonds_mensualite(60_000, 0, 0)

    assert plafonds["prudent"]["base"] == plafonds["legal"]["base"] == 11_250
    assert plafonds["tiers_plus_strict"] is False


def test_charges_et_prets_deduits_des_deux_regles():
    plafonds = calculer_plafonds_mensualite(300_000, 20_000, 30_000)

    assert plafonds["prudent"]["sans_prets"] == 80_000
    assert plafonds["prudent"]["avec_prets"] == 50_000
    assert plafonds["legal"]["avec_prets"] == 150_000


def test_route_capacite_renvoie_les_deux_resultats():
    app.dependency_overrides[get_current_user] = lambda: None
    try:
        reponse = TestClient(app).post("/simulations/capacite", json={
            "revenu_mensuel": 300_000,
            "montant_souhaite": 3_000_000,
            "charges_mensuelles": 0,
            "total_mensualites_prets_en_cours": 0,
        })
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert reponse.status_code == 200
    resultat = reponse.json()
    assert resultat["mensualite_max_avec_prets"] == 100_000
    assert resultat["legal"]["mensualite_max_avec_prets"] == 200_000
    assert resultat["plafond_endettement"] == 100_000
    if resultat["demande_faisable"]:
        # La regle prudente ne peut jamais permettre une duree plus courte que la loi.
        assert resultat["legal"]["demande_faisable"]
        assert resultat["legal"]["duree_min_faisable"] <= resultat["duree_min_faisable"]
