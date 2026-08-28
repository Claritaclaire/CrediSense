import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.message_ia import MessageIA
from app.schemas.message_ia import (
    AssistantRequest,
    RecommandationRequest,
    ExplicationClauseRequest,
    MessageIAOut,
)
from app.services.claude_service import (
    generer_recommandation_locale,
    expliquer_clause_locale,
)
from app.services.dify_service import (
    generer_recommandation,
    expliquer_clause,
    repondre_assistant,
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
            frais_dossier_min = 5000.0 if "scolaire" in offre.nom_banque.lower() else 0.0
            resultat = simuler_credit(
                capital=data.montant_souhaite,
                taux_annuel=offre.taux_annuel,
                duree_mois=data.duree_mois,
                frais_dossier_pct=offre.frais_dossier_pct,
                assurance_pct_an=offre.assurance_pct_an,
                frais_dossier_min=frais_dossier_min,
            )
            offres_simulees.append({
                "offre_id": str(offre.id),
                "nom_banque": offre.nom_banque,
                "description": offre.description or "",
                "categorie_client": offre.categorie_client,
                "taux_nominal": offre.taux_annuel,
                "montant_max": offre.montant_max,
                "duree_min_mois": offre.duree_min_mois,
                "duree_max_mois": offre.duree_max_mois,
                "frais_dossier_pct": offre.frais_dossier_pct,
                "assurance_pct_an": offre.assurance_pct_an,
                "mensualite": resultat["mensualite"],
                "taeg": resultat["taeg"],
                "cout_total": resultat["cout_total"],
                "offre_selectionnee": data.offre_id == offre.id,
            })

    offres_simulees.sort(key=lambda offre: offre["taeg"])

    try:
        reponse_ia = generer_recommandation(data.model_dump(), offres_simulees)
    except Exception as exc:
        logger.exception("Échec Dify lors de la recommandation IA")
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
        logger.exception("Échec Dify lors de l'explication d'une clause")
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


@router.post("/assistant", response_model=MessageIAOut)
def assistant(data: AssistantRequest, db: Session = Depends(get_db)):
    question = data.question.strip()
    if not question:
        raise HTTPException(status_code=422, detail="La question ne peut pas être vide.")

    try:
        reponse_ia = repondre_assistant(question, data.page)
    except Exception:
        logger.exception("Échec Dify lors de la question de l'assistant")
        raise HTTPException(
            status_code=503,
            detail="L'assistant est momentanément indisponible.",
        )

    message = MessageIA(
        simulation_id=None,
        type="assistant",
        contenu_entree=question,
        contenu_reponse=reponse_ia,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message