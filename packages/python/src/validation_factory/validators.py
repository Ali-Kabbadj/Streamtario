from abc import ABC, abstractmethod
from typing import Any, Sequence
from fastapi_factory.exceptions import ApiException


class ValidatorException(ApiException):
    """
    A structured exception for validation failures.
    Automatically generates a user-friendly message and details.
    """

    def __init__(self, field_name: str, invalid_value: Any, reason: str):
        try:
            serializable_value = str(invalid_value)
        except Exception:
            serializable_value = "Unserializable Value"

        message = f"Validation failed for field '{field_name}': {reason}"
        details = {
            "field": field_name,
            "invalid_value": serializable_value,
            "reason": reason,
        }
        super().__init__(message=message, status_code=422, details=details)


class IValidator(ABC):
    @abstractmethod
    async def validate(self, value: Any, **kwargs) -> None:
        pass


async def run_validators(value: Any, validators: Sequence[IValidator], **kwargs):
    for validator in validators:
        await validator.validate(value, **kwargs)
