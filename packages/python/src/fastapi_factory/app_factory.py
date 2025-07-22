import logging
from fastapi import FastAPI

from .middleware import HttpLoggingMiddleware
from .settings import BaseAppSettings
from .handlers import add_exception_handlers
from core.utils.logging import setup_logging, log_init, log_info
from dependency_injector.containers import DeclarativeContainer


class Application(FastAPI):
    container: DeclarativeContainer


def disable_uvicorn_logging():
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        logging.getLogger(name).handlers.clear()
        logging.getLogger(name).propagate = False


def create_app(settings: BaseAppSettings) -> Application:
    docs_url = "/docs" if settings.APP_ENV == "development" else None
    redoc_url = "/redoc" if settings.APP_ENV == "development" else None

    app = Application(title=settings.APP_NAME, docs_url=docs_url, redoc_url=redoc_url)

    app.add_middleware(HttpLoggingMiddleware)

    add_exception_handlers(app)

    @app.on_event("startup")
    async def startup_event():
        setup_logging(app_name=settings.APP_NAME)
        disable_uvicorn_logging()
        log_init(
            f"Service '{settings.APP_NAME}' starting up in '{settings.APP_ENV}' mode"
        )
        log_info(f"Accesible at : 'https://{settings.APP_HOST}:{settings.APP_PORT}'")

    @app.get("/health", tags=["System"])
    async def health_check():
        return {"status": "ok", "service": settings.APP_NAME}

    return app
