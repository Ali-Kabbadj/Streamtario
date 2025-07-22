from typing import Any, Generic, TypeVar
from pydantic import BaseModel, Field
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder

from https_factory.models import SuccessResponse as BaseSuccessResponse

T = TypeVar("T")


SuccessResponse = BaseSuccessResponse[T]


def create_success_response(
    data: Any,
    status_code: int = 200,
) -> JSONResponse:
    """
    Creates a standardized JSONResponse for a successful API call.
    It wraps the payload in the SuccessResponse model.
    """
    # Now we provide the status_code to the model, which fixes the validation error.
    payload = SuccessResponse(data=data, status_code=status_code)
    content = jsonable_encoder(payload.model_dump(by_alias=True))
    return JSONResponse(status_code=status_code, content=content)
