import re
from validation_factory.validators import IValidator, ValidatorException
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.account_repository import AccountRepository


class PasswordStrengthValidator(IValidator):
    async def validate(self, value: str, **kwargs) -> None:
        if not isinstance(value, str):
            raise ValidatorException(
                field_name="password",
                invalid_value=value,
                reason="Password must be a string.",
            )
        if len(value) < 8:
            raise ValidatorException(
                field_name="password",
                invalid_value=f"{len(value)} chars",
                reason="Password must be at least 8 characters long.",
            )
        if not re.search(r"[a-z]", value):
            raise ValidatorException(
                field_name="password",
                invalid_value="******",
                reason="Password must contain at least one lowercase letter.",
            )
        if not re.search(r"[A-Z]", value):
            raise ValidatorException(
                field_name="password",
                invalid_value="******",
                reason="Password must contain at least one uppercase letter.",
            )
        if not re.search(r"[0-9]", value):
            raise ValidatorException(
                field_name="password",
                invalid_value="******",
                reason="Password must contain at least one number.",
            )


class UniqueEmailValidator(IValidator):
    async def validate(self, value: str, **kwargs) -> None:
        session = kwargs.get("session")

        if not isinstance(session, AsyncSession):
            raise ValueError(
                "A valid AsyncSession was not provided to UniqueEmailValidator."
            )

        repo = AccountRepository(session)
        existing_account = await repo.get_by_email(value)

        if existing_account:
            raise ValidatorException(
                field_name="email",
                invalid_value=value,
                reason="An account with this email address already exists.",
            )
