"""Ajoute les champs necessaires a l'authentification a deux facteurs (2FA/TOTP)."""
from sqlalchemy import text

from app.database import engine

with engine.begin() as connection:
    connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_secret VARCHAR(64)"))
    connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_enabled BOOLEAN NOT NULL DEFAULT FALSE"))

print("Migration 2FA terminée.")
