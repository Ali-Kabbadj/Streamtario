from abc import ABC, abstractmethod

from typing import Any, List, Optional, Sequence
from fastapi_factory.exceptions import ValidationException as ApiException


class ValidatorException(ApiException):
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(message=message, status_code=422, details=details)


class IValidator(ABC):
    @abstractmethod
    async def validate(self, value: Any, **kwargs) -> None:
        pass


async def run_validators(value: Any, validators: Sequence[IValidator], **kwargs):
    for validator in validators:
        await validator.validate(value, **kwargs)
