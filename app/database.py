from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings

db_url = settings.database_url

# Compatibilité dialecte MySQL / TiDB pour SQLAlchemy 2.0
if db_url.startswith("mysql://"):
    db_url = db_url.replace("mysql://", "mysql+pymysql://", 1)

# Options de connexion et de sécurité
connect_args = {}
# TiDB Cloud Serverless exige TLS/SSL
if "tidbcloud.com" in db_url or "ssl" in db_url:
    connect_args["ssl"] = {"ssl_mode": "VERIFY_IDENTITY"}

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True,      # Détecte et recycle automatiquement les connexions inactives
    pool_recycle=300,        # Renouvelle les connexions toutes les 5 min (idéal pour TiDB Serverless)
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dépendance FastAPI : fournit une session DB et la ferme après usage."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
