from typing import Any, Generic, TypeVar
from pydantic import BaseModel, Field
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder

T = TypeVar("T")


class SuccessResponse(BaseModel, Generic[T]):
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
    # FIX: Explicitly pass ok=True to satisfy Pylance.
    payload = SuccessResponse(ok=True, data=data)

    # We still need by_alias=True to ensure JSON uses camelCase.
    content = jsonable_encoder(payload.model_dump(by_alias=True))

    return JSONResponse(status_code=status_code, content=content)
