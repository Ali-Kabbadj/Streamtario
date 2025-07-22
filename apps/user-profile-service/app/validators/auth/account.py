import re
from validation_factory.validators import IValidator, ValidatorException
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.auth.account import AccountRepository


class PasswordStrengthValidator(IValidator):
    async def validate(self, value: str, **kwargs) -> None:
        if not isinstance(value, str):
            raise ValidatorException("Password must be a string.")
        if len(value) < 8:
            raise ValidatorException("Password must be at least 8 characters long.")
        if not re.search(r"[a-z]", value):
            raise ValidatorException(
                "Password must contain at least one lowercase letter."
            )
        if not re.search(r"[A-Z]", value):
            raise ValidatorException(
                "Password must contain at least one uppercase letter."
            )
        if not re.search(r"[0-9]", value):
            raise ValidatorException("Password must contain at least one number.")


class UniqueEmailValidator(IValidator):
    async def validate(self, value: str, **kwargs) -> None:
        session = kwargs.get("session")

        if not isinstance(session, AsyncSession):
            raise ValueError(
                "A valid AsyncSession was not provided to UniqueEmailValidator. "
                "This is a programming error."
            )

        repo = AccountRepository(session)
        existing_account = await repo.get_by_email(value)

        if existing_account:
            raise ValidatorException(
                "An account with this email address already exists.",
                details={"email": value},
            )
