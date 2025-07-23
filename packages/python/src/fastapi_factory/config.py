from pydantic_settings import BaseSettings
from dotenv import find_dotenv
from typing import Optional


class BaseAppSettings(BaseSettings):
    """Defines common settings for all our services."""

    # --- Application Settings
    APP_ENV: str = "development"
    APP_NAME: str = "StreamtarioService"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    RELOAD: bool = True
    SSL_KEYFILE: Optional[str] = None
    SSL_CERTFILE: Optional[str] = None

    # --- Database Settings (Optional)
    DB_USER: Optional[str] = None
    DB_PASSWORD: Optional[str] = None
    DB_HOST: Optional[str] = None
    DB_PORT: Optional[int] = None
    DB_NAME: Optional[str] = None

    # --- Cache Settings (Optional)
    REDIS_HOST: Optional[str] = None
    REDIS_PORT: Optional[int] = None

    # --- NEW: Service-to-Service Communication ---
    ADDON_CONTROLLER_URL: Optional[str] = None
    ACCOUNT_PROFILE_SERVICE: Optional[str] = None

    class Config:
        env_file = find_dotenv()
        env_file_encoding = "utf-8"
