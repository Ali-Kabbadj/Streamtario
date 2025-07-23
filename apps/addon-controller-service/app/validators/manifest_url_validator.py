from validation_factory.validators import IValidator
from domain_exceptions.exceptions import ValidatorRuleException


class ManifestUrlValidator(IValidator):
    async def validate(self, value: str, **kwargs) -> None:
        if not isinstance(value, str):
            raise ValidatorRuleException(
                field_name="url",
                invalid_value=value,
                reason="The provided URL must be a string.",
            )
        if not value.startswith(("http://", "https://")):
            raise ValidatorRuleException(
                field_name="url",
                invalid_value=value,
                reason="The URL must start with 'http://' or 'https://'.",
            )
        if not value.endswith(".json"):
            raise ValidatorRuleException(
                field_name="url",
                invalid_value=value,
                reason="The URL must end with '.json' to be a valid manifest.",
            )
