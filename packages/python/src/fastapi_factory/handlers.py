from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from .exceptions import ApiException


async def api_exception_handler(request: Request, exc: ApiException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "ok": False,
            "error": {
                "type": exc.__class__.__name__,
                "message": exc.message,
                "details": exc.details,
            },
        },
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    details = {
        "reason": exc.detail,
        "context": {
            "request_method": request.method,
            "request_path": request.url.path,
            "client_ip": request.client.host,
        },
    }

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "ok": False,
            "error": {
                "type": "HttpException",
                "message": "An HTTP error occurred.",
                "details": details,
            },
        },
    )


def add_exception_handlers(app: FastAPI):
    app.add_exception_handler(ApiException, api_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
