from typing import Sequence
from fastapi_factory.config import BaseAppSettings
from pydantic_settings import SettingsConfigDict
from pydantic import model_validator


class AccountProfileSettings(BaseAppSettings):
    """
    No need to hard‑code APP_NAME or APP_PORT here—
    they’ll come from project‑x/.env
    """

    pass


settings = AccountProfileSettings()
