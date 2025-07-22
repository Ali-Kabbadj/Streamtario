import re
from validation_factory.validators import IValidator, ValidatorException


class ManifestUrlValidator(IValidator):
    """
    Performs a basic check to ensure the URL format is plausible.
    """

    async def validate(self, value: str, **kwargs) -> None:
        if not isinstance(value, str):
            raise ValidatorException(
                field_name="url",
                invalid_value=value,
                reason="The provided URL must be a string.",
            )

        if not value.startswith(("http://", "https://")):
            raise ValidatorException(
                field_name="url",
                invalid_value=value,
                reason="The URL must start with 'http://' or 'https://'.",
            )

        if not value.endswith(".json"):
            raise ValidatorException(
                field_name="url",
                invalid_value=value,
                reason="The URL must end with '.json' to be a valid manifest.",
            )
