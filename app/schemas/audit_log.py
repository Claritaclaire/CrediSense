import uuid
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.audit_log import ActionType

class AuditLogBase(BaseModel):
    admin_id: uuid.UUID
    action: ActionType
    target_table: Optional[str] = None
    target_id: Optional[str] = None
    details: Optional[str] = None

class AuditLogCreate(AuditLogBase):
    pass

class AuditLogOut(AuditLogBase):
    id: uuid.UUID
    timestamp: datetime

    class Config:
        from_attributes = True