from pydantic import BaseModel
from typing import Optional


class ErrorResponse(BaseModel):
    message: str
    code: Optional[str] = None
    details: Optional[str] = None
