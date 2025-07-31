from validation_factory.validators import IValidator
from domain_exceptions.exceptions import ApiException
from api_contract.errors import ApiErrorCode


class ManifestUrlValidator(IValidator):
    async def validate(self, value: str, **kwargs) -> None:
        if not isinstance(value, str):
            raise ApiException(
                ApiErrorCode.VALIDATION_MANIFEST_URL_INVALID,
                details={"reason": "URL must be a string."},
            )

        if not value.startswith(("http://", "https://")):
            raise ApiException(
                ApiErrorCode.VALIDATION_MANIFEST_URL_INVALID,
                details={"reason": "URL must start with http:// or https://."},
            )

        if not value.endswith(".json"):
            raise ApiException(
                ApiErrorCode.VALIDATION_MANIFEST_URL_INVALID,
                details={"reason": "URL must end with .json."},
            )
