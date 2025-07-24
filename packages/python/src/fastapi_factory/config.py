import os
from typing import Optional, Sequence, Annotated
from pydantic_settings import BaseSettings, SettingsConfigDict, NoDecode
from dotenv import find_dotenv
from pydantic import field_validator
from pathlib import Path

ROOT_ENV = Path(__file__).parents[4] / ".env"


class BaseAppSettings(BaseSettings):
    # --- Application
    APP_ENV: str = "development"
    APP_NAME: str = "StreamtarioService"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    RELOAD: bool = True

    # --- SSL
    SSL_KEYFILE: Optional[str] = None
    SSL_CERTFILE: Optional[str] = None

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
    ADDON_CONTROLLER_URL: Optional[str] = None
    ACCOUNT_PROFILE_SERVICE: Optional[str] = None

    # --- CORS
    ALLOWED_ORIGINS: Annotated[Sequence[str], NoDecode] = []

    # model_config = SettingsConfigDict(
    #     env_file=find_dotenv(usecwd=True, raise_error_if_not_found=False),
    #     env_file_encoding="utf-8",
    #     # you could also disable JSON decoding globally with enable_decoding=False
    # )

    # @field_validator("ALLOWED_ORIGINS", mode="before")
    # @classmethod
    # def _split_origins(cls, v):
    #     # v is the raw string from .env
    #     if isinstance(v, str):
    #         return [o.strip() for o in v.split(",") if o.strip()]
    #     return v

    model_config = SettingsConfigDict(
        # first load the global root, then load the project’s .env last
        env_file=[
            str(ROOT_ENV),  # /path/to/monorepo/.env
            find_dotenv(
                usecwd=True,  # e.g. /path/to/monorepo/project-x/.env
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
