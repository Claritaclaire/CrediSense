from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import tous les modèles pour l'enregistrement SQLAlchemy
from app import models

from app.routers import auth, offres, simulations, ia, user, demandes_credit, historique_prets
from app.routers import admin_config, admin_audit, admin_ia

app = FastAPI(
    title='Credit Simulateur',
    description='API de simulation de crédits avec recommandations IA',
    version='1.0.0',
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(auth.router)
app.include_router(offres.router)
app.include_router(simulations.router)
app.include_router(ia.router)
app.include_router(user.router)
app.include_router(demandes_credit.router)
app.include_router(historique_prets.router)
app.include_router(admin_config.router)
app.include_router(admin_audit.router)
app.include_router(admin_ia.router)

@app.get('/', tags=['Général'])
def root():
    return {'message': 'API Credit Simulateur'}