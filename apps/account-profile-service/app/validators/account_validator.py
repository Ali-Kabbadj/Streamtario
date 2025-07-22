import re
from validation_factory.validators import IValidator, ValidatorException
from app.domain.repositories.i_account_repository import IAccountRepository


class PasswordStrengthValidator(IValidator):
    # ... (no changes here)
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
    # --- FIX: The validator now depends on the repository interface ---
    async def validate(self, value: str, **kwargs) -> None:
        repo: IAccountRepository | None = kwargs.get("account_repository")
        if not repo:
            raise ValueError(
                "IAccountRepository must be provided to UniqueEmailValidator."
            )

        existing_account = await repo.get_by_email(value)
        if existing_account:
            raise ValidatorException(
                field_name="email",
                invalid_value=value,
                reason="An account with this email address already exists.",
            )
