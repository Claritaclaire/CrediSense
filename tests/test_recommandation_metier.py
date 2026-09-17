from app.services.calculs_financiers import calculer_quotite_cessible_legale


def test_quotite_cessible_revenu_330000():
    resultat = calculer_quotite_cessible_legale(330_000)

    assert resultat["quotite_cessible_totale"] == 230_000.0
    assert resultat["taux_effectif_pct"] == 69.7


def test_mensualite_disponible_tient_compte_des_charges_et_prets():
    quotite = calculer_quotite_cessible_legale(330_000)["quotite_cessible_totale"]
    charges = 50_000
    prets_en_cours = 30_000

    mensualite_disponible = max(0, quotite - charges - prets_en_cours)

    assert mensualite_disponible == 150_000.0
    assert 150_000 <= mensualite_disponible
    assert mensualite_disponible + charges + prets_en_cours <= quotite