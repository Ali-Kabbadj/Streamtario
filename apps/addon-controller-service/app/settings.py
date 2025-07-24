from fastapi_factory.config import BaseAppSettings


class AddonControllerSettings(BaseAppSettings):
    """
    No need to hard‑code APP_NAME or APP_PORT here—
    they’ll come from project‑x/.env
    """

    pass


settings = AddonControllerSettings()
