import pytest
from pydantic import ValidationError

from app.schemas.offre_credit import OffreCreditCreate, OffreCreditUpdate
from app.services.calculs_financiers import TAUX_TVA, simuler_credit


def _simuler(**kwargs):
    parametres = dict(
        capital=1_000_000, taux_annuel=0.12, duree_mois=12,
        frais_dossier_pct=0.005, assurance_pct_an=0.004,
    )
    parametres.update(kwargs)
    return simuler_credit(**parametres)


def test_tva_augmente_mensualite_et_cout():
    sans_tva = _simuler(taux_tva=0.0)
    avec_tva = _simuler()

    assert avec_tva["mensualite"] > sans_tva["mensualite"]
    assert avec_tva["cout_total"] > sans_tva["cout_total"]
    assert avec_tva["taeg"] > sans_tva["taeg"]
    assert sans_tva["total_tva"] == 0


def test_ventilation_interets_ht_et_tva():
    resultat = _simuler()
    tableau = resultat["tableau_amortissement"]

    for ligne in tableau:
        assert ligne["tva"] == pytest.approx(ligne["interets"] * TAUX_TVA, abs=0.02)
        assert ligne["mensualite"] == pytest.approx(
            ligne["part_capital"] + ligne["interets"] + ligne["tva"], abs=0.02
        )

    assert tableau[-1]["capital_restant_fin"] == 0
    assert sum(ligne["part_capital"] for ligne in tableau) == pytest.approx(1_000_000, abs=0.05)


def test_frais_de_dossier_minimum_et_tva_sur_frais():
    # 0,5 % de 1 000 000 = 5 000 HT, inferieur au minimum de 25 000 HT.
    resultat = _simuler(frais_dossier_min=25_000)

    assert resultat["frais_dossier_ht"] == 25_000
    assert resultat["frais_dossier"] == pytest.approx(25_000 * (1 + TAUX_TVA), abs=0.01)


def test_assurance_hors_tva():
    resultat = _simuler()
    assert resultat["assurance_mensuelle"] == pytest.approx(1_000_000 * 0.004 / 12, abs=0.01)


def _offre(**kwargs):
    donnees = dict(
        nom_banque="Test", taux_annuel=0.12, duree_min_mois=1, duree_max_mois=12,
        frais_dossier_pct=0.005, assurance_pct_an=0.004, montant_max=1_000_000,
    )
    donnees.update(kwargs)
    return donnees


def test_plafond_taux_15_pourcent():
    assert OffreCreditCreate(**_offre(taux_annuel=0.15)).taux_annuel == 0.15

    with pytest.raises(ValidationError):
        OffreCreditCreate(**_offre(taux_annuel=0.16))
    # Un taux saisi en pourcentage (12 au lieu de 0.12) est refuse.
    with pytest.raises(ValidationError):
        OffreCreditUpdate(taux_annuel=12)
    with pytest.raises(ValidationError):
        OffreCreditUpdate(frais_dossier_min=-1)

    assert OffreCreditUpdate(montant_max=2_000_000).taux_annuel is None
