"""Ajoute le montant minimum des frais de dossier (FCFA HT) aux offres de credit."""
from sqlalchemy import text

from app.database import engine

with engine.begin() as connection:
    connection.execute(text(
        "ALTER TABLE offres_credit ADD COLUMN IF NOT EXISTS frais_dossier_min FLOAT NOT NULL DEFAULT 0"
    ))
    # Reprend le minimum de 5 000 FCFA jusque-la code en dur pour le credit scolaire.
    connection.execute(text(
        "UPDATE offres_credit SET frais_dossier_min = 5000 "
        "WHERE LOWER(nom_banque) LIKE '%scolaire%' AND frais_dossier_min = 0"
    ))

print("Migration frais de dossier minimum terminée.")
