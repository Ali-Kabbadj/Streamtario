import re
from validation_factory.validators import IValidator
from domain_exceptions.exceptions import ApiException
from api_contract.errors import ApiErrorCode
from app.domain.repositories.i_account_repository import IAccountRepository


class PasswordStrengthValidator(IValidator):
    async def validate(self, value: str, **kwargs) -> None:
        if (
            not isinstance(value, str)
            or len(value) < 8
            or not re.search(r"[a-z]", value)
            or not re.search(r"[A-Z]", value)
            or not re.search(r"[0-9]", value)
        ):
            raise ApiException(
                error_code=ApiErrorCode.VALIDATION_PASSWORD_STRENGTH,
                details={"field": "password"},
            )


class UniqueEmailValidator(IValidator):
    async def validate(self, value: str, **kwargs) -> None:
        repo: IAccountRepository | None = kwargs.get("account_repository")
        if not repo:
            raise ValueError(
                "IAccountRepository must be provided to UniqueEmailValidator."
            )
        existing_account = await repo.get_by_email(value)
        if existing_account:
            raise ApiException(
                error_code=ApiErrorCode.ACCOUNT_EMAIL_EXISTS,
                details={"field": "email"},
            )
