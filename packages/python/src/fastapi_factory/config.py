import os
from typing import Optional, Sequence, Annotated
from pydantic_settings import BaseSettings, SettingsConfigDict, NoDecode
from dotenv import find_dotenv
from pydantic import field_validator
from pathlib import Path

ROOT_ENV = Path(__file__).parents[4] / ".env"


class BaseAppSettings(BaseSettings):
    # --- Application
    APP_ENV: str = ""
    APP_NAME: str = ""
    APP_PORT: Optional[int] = None
    APP_HOST: Optional[str] = None
    RELOAD: Optional[bool] = None

    # --- SSL
    SSL_KEYFILE: Optional[str] = None
    SSL_CERTFILE: Optional[str] = None
    SSL_CA_CERTFILE: Optional[str] = None

    # --- Database
    DB_USER: Optional[str] = None
    DB_PASSWORD: Optional[str] = None
    DB_HOST: Optional[str] = None
    DB_PORT: Optional[int] = None
    DB_NAME: Optional[str] = None

    # --- Cache
    REDIS_HOST: Optional[str] = None
    REDIS_PORT: Optional[int] = None

    # --- Service‑to‑Service URLs
    ADDON_CONTROLLER_SERVICE_URL: Optional[str] = None
    ACCOUNT_PROFILE_SERVICE_URL: Optional[str] = None
    AUTH_SERVICE_URL: Optional[str] = None
    TORRSERVER_BASE_URL: Optional[str] = None
    FRONTEND_URL: Optional[str] = None
    NEXT_PUBLIC_STREAMING_DAEMON_WS_URL: Optional[str] = None
    NEXT_PUBLIC_API_GATEWAY_URL: Optional[str] = None
    NEXT_PUBLIC_STREAMING_SERVICE_URL: Optional[str] = None

    # --- CORS
    ALLOWED_ORIGINS: Annotated[Sequence[str], NoDecode] = []

    # --- Security JWT service
    JWT_SECRET_KEY: Optional[str] = None
    JWT_ALGORITHM: Optional[str] = None
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: Optional[int] = None
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: Optional[int] = None

    # Google Auth
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRETS_FILE: str = ""
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: Optional[str] = None

    # TMDB
    TMDB_API_KEY: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=[
            str(ROOT_ENV),
            find_dotenv(
                usecwd=True,
                raise_error_if_not_found=False,
            ),
        ],
        env_file_encoding="utf-8",
    )

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def _split_origins(cls, v):
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v
