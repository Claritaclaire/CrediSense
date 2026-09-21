"""
Script d'initialisation et de migration universel pour TiDB (MySQL Cloud) et Render.
Ce script s'exécute automatiquement lors de la phase de 'build' sur Render.
"""
import sys
import logging
from pathlib import Path

# Ajouter le répertoire racine au PYTHONPATH
sys.path.insert(0, str(Path(__file__).parent))

from app.database import engine, SessionLocal, Base
from app import models
from app.models.offre_credit import OffreCredit
from app.models.system_setting import SystemParameter

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("init_db_tidb")

OFFRES_PAR_DEFAUT = [
    {
        "nom_banque": "Crédit Scolaire CCA",
        "categorie_client": "particulier",
        "description": "Financement des frais de scolarité, inscriptions universitaires et fournitures scolaires.",
        "taux_annuel": 0.12,
        "duree_min_mois": 1,
        "duree_max_mois": 11,
        "frais_dossier_pct": 0.005,
        "assurance_pct_an": 0.004,
        "montant_max": 5_000_000.0,
        "actif": True,
    },
    {
        "nom_banque": "CCT Fonctionnaire",
        "categorie_client": "particulier",
        "description": "Crédit à court et moyen terme réservé aux agents de la fonction publique et du secteur public.",
        "taux_annuel": 0.10,
        "duree_min_mois": 12,
        "duree_max_mois": 120,
        "frais_dossier_pct": 0.01,
        "assurance_pct_an": 0.004,
        "montant_max": 15_000_000.0,
        "actif": True,
    },
    {
        "nom_banque": "Crédit d'Urgence",
        "categorie_client": "particulier",
        "description": "Avance de trésorerie pour faire face aux imprévus, dépenses de santé ou événements familiaux.",
        "taux_annuel": 0.12,
        "duree_min_mois": 3,
        "duree_max_mois": 18,
        "frais_dossier_pct": 0.015,
        "assurance_pct_an": 0.004,
        "montant_max": 1_500_000.0,
        "actif": True,
    },
    {
        "nom_banque": "Découvert Autorisé",
        "categorie_client": "particulier",
        "description": "Facilité de caisse pour pallier les fins de mois difficiles avec souplesse.",
        "taux_annuel": 0.12,
        "duree_min_mois": 1,
        "duree_max_mois": 3,
        "frais_dossier_pct": 0.01,
        "assurance_pct_an": 0.0,
        "montant_max": 1_000_000.0,
        "actif": True,
    },
    {
        "nom_banque": "Découvert Permanent Avancé sur Salaire",
        "categorie_client": "particulier",
        "description": "Avance renouvelable indexée sur le salaire domicilié à la CCA Bank.",
        "taux_annuel": 0.12,
        "duree_min_mois": 1,
        "duree_max_mois": 1,
        "frais_dossier_pct": 0.005,
        "assurance_pct_an": 0.0,
        "montant_max": 3_000_000.0,
        "actif": True,
    },
    {
        "nom_banque": "Crédit Commercial",
        "categorie_client": "professionnel",
        "description": "Financement des besoins d'exploitation, stock et investissements des professionnels.",
        "taux_annuel": 0.12,
        "duree_min_mois": 6,
        "duree_max_mois": 60,
        "frais_dossier_pct": 0.015,
        "assurance_pct_an": 0.005,
        "montant_max": 25_000_000.0,
        "actif": True,
    },
]

PARAMETRES_SYSTEME = [
    {"key": "base_interest_rate", "value": "0.05", "description": "Taux d'intérêt de base", "is_sensitive": False},
    {"key": "default_margin", "value": "0.02", "description": "Marge appliquée aux offres", "is_sensitive": False},
    {"key": "max_duration_months", "value": "360", "description": "Durée maximale en mois", "is_sensitive": False},
    {"key": "insurance_rate", "value": "0.01", "description": "Taux d'assurance standard", "is_sensitive": False},
    {"key": "dossier_fee", "value": "100", "description": "Frais fixe de dossier", "is_sensitive": False},
]


def init_database():
    logger.info("=== Initialisation de la base de données (TiDB / Cloud) ===")
    
    # 1. Tester la connexion
    try:
        with engine.connect() as conn:
            logger.info("✓ Connexion réussie à la base de données")
    except Exception as exc:
        logger.error(f"✗ Échec de connexion à la base de données : {exc}")
        sys.exit(1)

    # 2. Création des tables
    try:
        logger.info("Création des tables si inexistantes...")
        Base.metadata.create_all(bind=engine)
        logger.info("✓ Toutes les tables ont été créées ou vérifiées.")
    except Exception as exc:
        logger.error(f"✗ Erreur lors de la création des tables : {exc}")
        sys.exit(1)

    # 3. Amorçage des données de référence
    db = SessionLocal()
    try:
        # Offres de crédit
        offres_existantes = db.query(OffreCredit).count()
        if offres_existantes == 0:
            logger.info("Amorçage du catalogue d'offres CCA Bank...")
            for offre_data in OFFRES_PAR_DEFAUT:
                db.add(OffreCredit(**offre_data))
            db.commit()
            logger.info(f"✓ {len(OFFRES_PAR_DEFAUT)} offres de crédit insérées.")
        else:
            logger.info(f"Catalogue déjà peuplé ({offres_existantes} offres existantes).")

        # Paramètres système
        params_existants = db.query(SystemParameter).count()
        if params_existants == 0:
            logger.info("Amorçage des paramètres système...")
            for param_data in PARAMETRES_SYSTEME:
                db.add(SystemParameter(**param_data))
            db.commit()
            logger.info(f"✓ {len(PARAMETRES_SYSTEME)} paramètres système insérés.")
        else:
            logger.info(f"Paramètres système déjà présents ({params_existants} paramètres).")

    except Exception as exc:
        logger.error(f"✗ Erreur lors de l'amorçage : {exc}")
        db.rollback()
    finally:
        db.close()

    logger.info("=== Base de données TiDB prête pour Render ! ===")


if __name__ == "__main__":
    init_database()
