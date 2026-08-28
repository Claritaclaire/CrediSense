import logging

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone

from app.database import get_db
from app.models.demande_credit import DemandeCredit, StatutDemande
from app.models.user import User, RoleUtilisateur
from app.schemas.demande_credit import DemandeCreditCreate, DemandeCreditOut, DemandeCreditUpdate, StatutUpdate
from app.core.security import get_current_user, exiger_role
from app.utils.mail import send_email
from app.config import settings

router = APIRouter(prefix="/demandes-credit", tags=["Demandes de crédit"])
logger = logging.getLogger(__name__)


def _envoyer_notification_demande(sujet: str, destinataire: str, contenu: str) -> None:
    try:
        send_email(sujet, [destinataire], contenu)
    except Exception:
        logger.exception("Échec d'envoi de la notification de demande vers %s", destinataire)

# Client : Soumettre une demande
@router.post("/", response_model=DemandeCreditOut, status_code=status.HTTP_201_CREATED)
def soumettre_demande(
    demande_data: DemandeCreditCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    nouvelle_demande = DemandeCredit(**demande_data.model_dump(), user_id=current_user.id)
    db.add(nouvelle_demande)
    db.commit()
    db.refresh(nouvelle_demande)

    sujet = f"Nouvelle demande de crédit #{nouvelle_demande.id}"
    body = f"""Bonjour,

Une nouvelle demande de crédit vient d'être soumise dans CrediSense.

Informations du client
----------------------
Nom : {current_user.nom}
Email : {current_user.email}
Identifiant client : {current_user.id}

Détails de la demande
---------------------
Référence : {nouvelle_demande.id}
Montant demandé : {nouvelle_demande.montant_demande:,.0f} FCFA
Durée souhaitée : {nouvelle_demande.duree_souhaitee} mois
Apport : {nouvelle_demande.apport or 0:,.0f} FCFA
Motif : {nouvelle_demande.motif or "Non précisé"}
Statut : {nouvelle_demande.statut.value}

Cordialement,
CrediSense
"""
    background_tasks.add_task(
        _envoyer_notification_demande,
        sujet,
        settings.demandes_email_destinataire or settings.smtp_from or "callcenter@cca-bank.com",
        body,
    )
    return nouvelle_demande

# Client : Voir ses propres demandes
@router.get("/mes-demandes", response_model=List[DemandeCreditOut])
def lister_mes_demandes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(DemandeCredit).filter(DemandeCredit.user_id == current_user.id).all()

# Conseiller/Admin : Voir toutes les demandes (avec filtres optionnels)
@router.get("/", response_model=List[DemandeCreditOut], dependencies=[Depends(exiger_role(RoleUtilisateur.conseiller, RoleUtilisateur.admin))])
def lister_toutes_demandes(
    db: Session = Depends(get_db),
    statut: Optional[StatutDemande] = None,
    skip: int = 0,
    limit: int = 100
):
    query = db.query(DemandeCredit)
    if statut:
        query = query.filter(DemandeCredit.statut == statut)
    return query.offset(skip).limit(limit).all()

# Conseiller/Admin : Mettre à jour le statut d'une demande (approuver/refuser, demander des documents, etc.)
@router.patch("/{demande_id}", response_model=DemandeCreditOut, dependencies=[Depends(exiger_role(RoleUtilisateur.conseiller, RoleUtilisateur.admin))])
def mettre_a_jour_demande(
    demande_id: UUID,
    demande_data: DemandeCreditUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    demande = db.query(DemandeCredit).filter(DemandeCredit.id == demande_id).first()
    if not demande:
        raise HTTPException(status_code=404, detail="Demande non trouvée")

    # Memorize old statut to detect change to approved/refused
    old_statut = demande.statut

    update_data = demande_data.model_dump(exclude_unset=True)
    if "statut" in update_data:
        update_data["traite_par_id"] = current_user.id  # Enregistrer qui a traité la demande
        update_data["date_mise_a_jour"] = datetime.now(timezone.utc)

    # Apply updates
    for key, value in update_data.items():
        setattr(demande, key, value)

    db.commit()
    db.refresh(demande)

    # If statut changed to approved or refused, send email to client
    new_statut = demande.statut
    if old_statut != new_statut and new_statut in (StatutDemande.approuvee, StatutDemande.refusee):
        # Retrieve client email
        client = db.query(User).filter(User.id == demande.user_id).first()
        if client and client.email:
            if new_statut == StatutDemande.approuvee:
                sujet = "Votre demande de crédit a été approuvée ✅"
                body = f"""Bonjour {client.nom},

Votre demande de crédit (référence #{demande.id}) a été approuvée par notre équipe.

Montant demandé : {demande.montant_demande:,.2f} €
Durée souhaitée : {demande.duree_souhaitee} mois

Veuillez vous présenter en agence avec les pièces justificatives nécessaires (pièce d'identité, justificatif de domicile, dernières fiches de paie, avis d'imposition, etc.) afin de finaliser votre dossier.

Nous reviendrons vers vous très prochainement pour les étapes suivantes.

Cordialement,
L’équipe Crédit Simulateur
"""
            else:  # refusé
                sujet = "Votre demande de crédit a été refusée ❌"
                body = f"""Bonjour {client.nom},

Nous regrettons de vous informer que votre demande de crédit (référence #{demande.id}) a été refusée.

Montant demandé : {demande.montant_demande:,.2f} €
Durée souhaitée : {demande.duree_souhaitee} mois

Si vous souhaitez connaître les raisons exactes ou discuter d’une alternative, n’hésitez pas à nous contacter ou à passer en agence avec vos documents pour un nouvel examen.

Cordialement,
L’équipe Crédit Simulateur
"""
            # Send email in background to avoid blocking the response
            background_tasks.add_task(send_email, sujet, [client.email], body)

    return demande

# Client : Voir une demande spécifique (la sienne uniquement)
@router.get("/{demande_id}", response_model=DemandeCreditOut)
def obtenir_demande(
    demande_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    demande = db.query(DemandeCredit).filter(DemandeCredit.id == demande_id).first()
    if not demande:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    if demande.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès non autorisé à cette demande"
        )
    return demande