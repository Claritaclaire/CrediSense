import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.message_ia import MessageIA
from app.schemas.message_ia import RecommandationRequest, ExplicationClauseRequest, MessageIAOut
from app.services.claude_service import (
    generer_recommandation,
    generer_recommandation_locale,
    expliquer_clause,
    expliquer_clause_locale,
)
from app.models.offre_credit import OffreCredit
from app.services.calculs_financiers import simuler_credit

router = APIRouter(prefix="/ia", tags=["Intelligence Artificielle"])
logger = logging.getLogger(__name__)


@router.post("/recommandation", response_model=MessageIAOut)
def recommandation(data: RecommandationRequest, db: Session = Depends(get_db)):
    offres = db.query(OffreCredit).filter(OffreCredit.montant_max >= data.montant_souhaite).all()

    offres_simulees = []
    for offre in offres:
        if offre.duree_min_mois <= data.duree_mois <= offre.duree_max_mois:
            resultat = simuler_credit(
                capital=data.montant_souhaite,
                taux_annuel=offre.taux_annuel,
                duree_mois=data.duree_mois,
                frais_dossier_pct=offre.frais_dossier_pct,
                assurance_pct_an=offre.assurance_pct_an,
            )
            offres_simulees.append({
                "offre_id": str(offre.id),
                "nom_banque": offre.nom_banque,
                "mensualite": resultat["mensualite"],
                "taeg": resultat["taeg"],
                "cout_total": resultat["cout_total"],
                "offre_selectionnee": data.offre_id == offre.id,
            })

    offres_simulees.sort(key=lambda offre: offre["taeg"])

    try:
        reponse_ia = generer_recommandation(data.model_dump(), offres_simulees)
    except Exception as exc:
        logger.exception("Échec Anthropic lors de la recommandation IA")
        reponse_ia = generer_recommandation_locale(data.model_dump(), offres_simulees)

    message = MessageIA(
        simulation_id=None,
        type="recommandation",
        contenu_entree=str(data.model_dump()),
        contenu_reponse=reponse_ia,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


@router.post("/explication-clause", response_model=MessageIAOut)
def explication_clause(data: ExplicationClauseRequest, db: Session = Depends(get_db)):
    try:
        reponse_ia = expliquer_clause(data.texte_clause)
    except Exception as exc:
        logger.exception("Échec Anthropic lors de l'explication d'une clause")
        reponse_ia = expliquer_clause_locale(data.texte_clause)

    message = MessageIA(
        simulation_id=None,
        type="explication_clause",
        contenu_entree=data.texte_clause,
        contenu_reponse=reponse_ia,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message
