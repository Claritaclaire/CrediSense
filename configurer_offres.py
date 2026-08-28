"""Migration du catalogue CCA : catégories et offres de crédit actives."""
from sqlalchemy import text

from app.database import SessionLocal
from app.models.offre_credit import OffreCredit


OFFRES = [
    ("Crédit Scolaire", "particulier", "Financement des frais de scolarité, inscriptions universitaires et fournitures.", 0.12, 100_000, 1, 11, 0.005, 0.004, 5_000_000),
    ("CCT Fonctionnaire", "particulier", "Crédit à court et moyen terme réservé aux agents du secteur public.", 0.10, 100_000, 12, 120, 0.01, 0.004, 15_000_000),
    ("Crédit d'Urgence", "particulier", "Avance de trésorerie pour les dépenses imprévues et les événements familiaux.", 0.12, 50_000, 3, 18, 0.015, 0.004, 1_500_000),
    ("Découvert Autorisé", "particulier", "Souplesse de trésorerie pour couvrir les décalages de fin de mois.", 0.12, 50_000, 1, 3, 0.01, 0.0, 1_000_000),
    ("Découvert Permanent Avancé sur Salaire", "particulier", "Avance renouvelable adossée au salaire domicilié auprès de la banque.", 0.12, 50_000, 1, 1, 0.005, 0.0, 3_000_000),
    ("Crédit Commercial", "professionnel", "Financement des besoins d'investissement et de trésorerie des professionnels.", 0.12, 500_000, 6, 60, 0.015, 0.005, 25_000_000),
    ("Ligne de Découvert", "professionnel", "Ligne de trésorerie destinée à absorber les décalages d'encaissement de l'entreprise.", 0.12, 100_000, 1, 60, 0.015, 0.005, 10_000_000),
]

ANCIENNES_OFFRES_DEMO = ("Crédit Projet Personnel", "Crédit Équipement", "Crédit Confiance+")


def main():
    db = SessionLocal()
    try:
        db.execute(text("ALTER TABLE offres_credit ADD COLUMN IF NOT EXISTS categorie_client VARCHAR NOT NULL DEFAULT 'particulier'"))
        db.execute(text("ALTER TABLE offres_credit ADD COLUMN IF NOT EXISTS actif BOOLEAN NOT NULL DEFAULT TRUE"))
        db.execute(text("ALTER TABLE offres_credit ADD COLUMN IF NOT EXISTS description VARCHAR"))
        db.commit()
        db.query(OffreCredit).filter(OffreCredit.nom_banque.in_(ANCIENNES_OFFRES_DEMO)).update({"actif": False}, synchronize_session=False)

        for nom, categorie, description, taux, _minimum, duree_min, duree_max, frais, assurance, plafond in OFFRES:
            offre = db.query(OffreCredit).filter(OffreCredit.nom_banque == nom).first()
            valeurs = dict(categorie_client=categorie, description=description, actif=True, taux_annuel=taux, duree_min_mois=duree_min,
                           duree_max_mois=duree_max, frais_dossier_pct=frais,
                           assurance_pct_an=assurance, montant_max=plafond)
            if offre:
                for cle, valeur in valeurs.items():
                    setattr(offre, cle, valeur)
            else:
                db.add(OffreCredit(nom_banque=nom, **valeurs))
        db.commit()
        print("Catalogue CCA configuré : 4 offres particulier, 2 offres professionnel.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
