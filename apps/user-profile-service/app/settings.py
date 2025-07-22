from fastapi_factory.settings import BaseAppSettings


class UserProfileSettings(BaseAppSettings):
    """
    Configuration specific to the User Profile service.
    """

    APP_NAME: str = "USER_PROFILE_SERVICE"
    APP_PORT: int = 8002
    SSL_KEYFILE: str = "../../local_dev_deps/certs/localhost+2-key.pem"
    SSL_CERTFILE: str = "../../local_dev_deps/certs/localhost+2.pem"


settings = UserProfileSettings()
