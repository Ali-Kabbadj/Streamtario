from typing import Any, Generic, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")


class SuccessResponse(BaseModel, Generic[T]):
    """Standard model for a successful API call."""

    is_success: bool = Field(True, frozen=True)
    status_code: int
    data: T


class ErrorResponse(BaseModel):
    """Standard model for a failed API call."""

    is_success: bool = Field(False, frozen=True)
    status_code: int
    error_message: str
    details: Any | None = None
