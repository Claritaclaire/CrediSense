"""Script de création des tables dans PostgreSQL avec encodage explicite."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import create_engine, event
from app.database import Base
from app import models  # Import all models to register them with Base

# Connexion directe sans charger .env (pour éviter les problèmes d'encodage)
db_url = "postgresql://user:claire@localhost:5432/credit_simulateur"

print(f"Connecting to database: {db_url}")

try:
    # Créer le moteur avec des options d'encodage explicites
    app_engine = create_engine(
        db_url,
        connect_args={"client_encoding": "utf8"},
        echo=False
    )
    
    # Tester la connexion
    with app_engine.connect() as conn:
        result = conn.execute("SELECT 1")
        print("✓ Successfully connected to PostgreSQL")
    
    # Créer toutes les tables
    print("Creating tables...")
    Base.metadata.create_all(bind=app_engine)
    print("✓ All tables created successfully")
    
    # Lister les tables créées
    inspector = __import__('sqlalchemy').inspect(app_engine)
    tables = inspector.get_table_names()
    print(f"\nTables created: {tables}")
    
    app_engine.dispose()
    print("\n✓ Database initialization complete!")
    
except Exception as e:
    print(f"✗ Error: {type(e).__name__}: {e}", file=sys.stderr)
    import traceback
    traceback.print_exc()
    sys.exit(1)
