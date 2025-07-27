from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from domain_exceptions.exceptions import ApiException
from api_contract.responses import ApiResponse, ErrorDetail


async def api_exception_handler(request: Request, exc: ApiException):
    """
    Handles our custom ApiException and formats it into the standard ApiResponse envelope.
    """
    error_payload = ErrorDetail(
        type=exc.code,  # Now using the code, e.g., "PROFILE_NOT_FOUND"
        dev_message=exc.message,
        ui_message=exc.ui_message,
        details=exc.details,
    )
    api_response = ApiResponse(ok=False, error=error_payload)
    return JSONResponse(
        status_code=exc.status_code,
        content=api_response.model_dump(exclude_none=True),
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    # This handler remains the same but is included for completeness
    error_payload = ErrorDetail(
        type="HttpException",
        dev_message=exc.detail,
        ui_message="An unexpected error occurred while processing your request.",
        details={"request_path": request.url.path},
    )
    api_response = ApiResponse(ok=False, error=error_payload)
    return JSONResponse(
        status_code=exc.status_code,
        content=api_response.model_dump(exclude_none=True),
    )


def add_exception_handlers(app: FastAPI):
    app.add_exception_handler(ApiException, api_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
