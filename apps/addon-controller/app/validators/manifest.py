import re
from validation_factory.validators import IValidator, ValidatorException


class ManifestUrlValidator(IValidator):
    """
    Performs a basic check to ensure the URL format is plausible.
    - Must be a string
    - Must start with http:// or https://
    - Must end with .json
    """

    async def validate(self, value: str, **kwargs) -> None:
        if not isinstance(value, str):
            raise ValidatorException("URL must be a string.", details={"url": value})

        if not value.startswith(("http://", "https://")):
            raise ValidatorException(
                "URL must start with http:// or https://.", details={"url": value}
            )

        if not value.endswith(".json"):
            raise ValidatorException(
                "URL must end with .json to be a valid manifest.",
                details={"url": value},
            )
