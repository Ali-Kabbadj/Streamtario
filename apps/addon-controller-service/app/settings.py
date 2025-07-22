from fastapi_factory.settings import BaseAppSettings


class AddonControllerSettings(BaseAppSettings):
    """
    Configuration specific to the Addon Controller service.
    This class inherits defaults from BaseAppSettings and only overrides what's needed.
    """

    APP_NAME: str = "ADDON_CONTROLLER_SERVICE"
    APP_PORT: int = 8001
    SSL_KEYFILE: str = "../../local_dev_deps/certs/localhost+2-key.pem"
    SSL_CERTFILE: str = "../../local_dev_deps/certs/localhost+2.pem"


settings = AddonControllerSettings()
