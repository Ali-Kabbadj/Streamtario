from typing import Any, Generic, TypeVar
from pydantic import BaseModel, Field
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder

T = TypeVar("T")


class SuccessResponse(BaseModel, Generic[T]):
    """The standard structure for a successful API response."""

    ok: bool = Field(True, frozen=True)
    data: T


def create_success_response(
    data: Any,
    status_code: int = 200,
) -> JSONResponse:
    """
    Creates a standardized JSONResponse for a successful API call.
    It wraps the payload in the SuccessResponse model.
    """
    payload = SuccessResponse(data=data)
    return JSONResponse(
        status_code=status_code, content=jsonable_encoder(payload.model_dump())
    )
