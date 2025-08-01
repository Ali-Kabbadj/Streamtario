from typing import cast

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from api_contract.responses import ApiResponse, ErrorDetail
from domain_exceptions.exceptions import ApiException


async def api_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handles our custom ApiException and formats it into the standard ApiResponse envelope.
    """
    api_exc = cast(ApiException, exc)
    error_payload = ErrorDetail(
        type=api_exc.code,
        dev_message=api_exc.message,
        ui_message=api_exc.ui_message,
        details=api_exc.details,
    )
    api_response = ApiResponse(ok=False, error=error_payload, data=None)
    return JSONResponse(
        status_code=api_exc.status_code,
        content=api_response.model_dump(exclude_none=True),
    )


async def http_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    http_exc = cast(StarletteHTTPException, exc)
    error_payload = ErrorDetail(
        type="HttpException",
        dev_message=http_exc.detail,
        ui_message="An unexpected error occurred while processing your request.",
        details={"request_path": request.url.path},
    )
    api_response = ApiResponse(ok=False, error=error_payload, data=None)
    return JSONResponse(
        status_code=http_exc.status_code,
        content=api_response.model_dump(exclude_none=True),
    )


def add_exception_handlers(app: FastAPI):
    app.add_exception_handler(ApiException, api_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
