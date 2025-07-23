from typing import Any, Generic, TypeVar, Optional
from pydantic import BaseModel, Field

T = TypeVar("T")


class ErrorDetail(BaseModel):
    """A detailed, structured error message."""

    type: str = Field(..., description="The class name of the exception that occurred.")
    dev_message: str = Field(
        ..., description="A detailed, technical message for developers."
    )
    ui_message: str = Field(
        ..., description="A safe, user-friendly message for display in a UI."
    )
    details: Optional[Any] = Field(
        None, description="Any extra structured details about the error."
    )


class ApiResponse(BaseModel, Generic[T]):
    """
    The standardized API response envelope for all endpoints.
    It is always returned with a 2xx or 4xx HTTP status code.
    5xx errors are handled as unhandled exceptions by the framework.
    """

    ok: bool = Field(
        ..., description="True for a successful request, False for a known error."
    )
    data: Optional[T] = Field(
        None, description="The data payload for a successful request. Null on error."
    )
    error: Optional[ErrorDetail] = Field(
        None, description="The structured error details. Null on success."
    )

    class Config:
        # Using by_alias for consistency is good, but let's stick to Python names internally
        # and let FastAPI handle the camelCase conversion on the boundary.
        populate_by_name = True
