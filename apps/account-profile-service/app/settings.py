from fastapi_factory.config import BaseAppSettings


class UserProfileSettings(BaseAppSettings):
    """
    Configuration specific to the User Profile service.
    """

    APP_NAME: str = "ACCOUNT_PROFILE_SERVICE"
    APP_PORT: int = 8002
    SSL_KEYFILE: str = "../../local_dev_deps/certs/localhost+2-key.pem"
    SSL_CERTFILE: str = "../../local_dev_deps/certs/localhost+2.pem"


settings = UserProfileSettings()
