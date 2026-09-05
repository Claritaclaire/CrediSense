"""Ajoute le rôle et les champs nécessaires à l'administration système."""
from sqlalchemy import text

from app.database import engine


with engine.begin() as connection:
    connection.execute(text("ALTER TYPE roleutilisateur ADD VALUE IF NOT EXISTS 'admin_systeme'"))
    connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS telephone VARCHAR"))
    connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS banque VARCHAR"))
    connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS agence VARCHAR"))
    connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS actif BOOLEAN NOT NULL DEFAULT TRUE"))
    connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions VARCHAR"))

print("Migration administration système terminée.")