import uuid
from pydantic import BaseModel
from typing import Optional

class SystemParameterBase(BaseModel):
    key: str
    value: str               # JSON string containing the actual value
    description: Optional[str] = None
    is_sensitive: bool = False

class SystemParameterCreate(SystemParameterBase):
    pass

class SystemParameterUpdate(BaseModel):
    value: Optional[str] = None
    description: Optional[str] = None
    is_sensitive: Optional[bool] = None

class SystemParameterOut(SystemParameterBase):
    id: uuid.UUID

    class Config:
        from_attributes = True