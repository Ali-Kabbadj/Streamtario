from abc import ABC, abstractmethod
from typing import Any, Sequence


class IValidator(ABC):
    @abstractmethod
    async def validate(self, value: Any, **kwargs) -> None:
        pass


async def run_validators(value: Any, validators: Sequence[IValidator], **kwargs):
    for validator in validators:
        await validator.validate(value, **kwargs)
