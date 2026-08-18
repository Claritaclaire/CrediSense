"""Script de création des tables dans PostgreSQL."""
import sys
from pathlib import Path

# Charger les variables d'environnement avant d'importer app.config
from dotenv import load_dotenv
load_dotenv()

sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import create_engine
from app.database import Base
from app import models  # Import all models to register them with Base

# Use the same connection string as in .env
db_url = "postgresql://postgres:claire@localhost:5432/credit_simulateur"

print(f"Connecting to database: {db_url}")

try:
    # Connexion à la base de données existante
    app_engine = create_engine(db_url)

    # Vérifier la connexion
    with app_engine.connect() as conn:
        print("✓ Successfully connected to PostgreSQL")

    # Créer toutes les tables
    print("Creating tables...")
    Base.metadata.create_all(bind=app_engine)
    print("✓ All tables created successfully")

    app_engine.dispose()
    print("\n✓ Database initialization complete!")

except Exception as e:
    print(f"✗ Error: {type(e).__name__}: {e}", file=sys.stderr)
    import traceback
    traceback.print_exc()
    sys.exit(1)