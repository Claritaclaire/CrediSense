# Import all models here to ensure they are registered with SQLAlchemy before any relationships are resolved
from .user import User
from .offre_credit import OffreCredit
from .simulation import Simulation
from .historique_pret import HistoriquePret
from .demande_credit import DemandeCredit
from .message_ia import MessageIA
from .system_setting import SystemParameter
from .audit_log import AdminAuditLog