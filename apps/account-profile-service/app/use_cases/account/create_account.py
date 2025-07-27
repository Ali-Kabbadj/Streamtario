from typing import Callable, Optional
from core.pydantic.domain.account import Account
from security_factory.services.passwordservice import IPasswordHasher
from validation_factory.validators import run_validators
from domain_exceptions.exceptions import ValidatorRuleException
from app.domain.interfaces.i_unit_of_work import IUnitOfWork
from app.validators.account_validator import (
    PasswordStrengthValidator,
    UniqueEmailValidator,
)
from core.utils.logging import log_error, log_info


class CreateAccountUseCase:
    def __init__(
        self,
        uow_factory: Callable[[], IUnitOfWork],
        password_hasher: IPasswordHasher,
    ):
        self.uow_factory = uow_factory
        self.password_hasher = password_hasher

    async def execute(self, email: str, password: str) -> Account:
        async with self.uow_factory() as uow:
            try:
                # We still validate password strength for direct sign-ups
                await run_validators(password, [PasswordStrengthValidator()])
                await run_validators(
                    email, [UniqueEmailValidator()], account_repository=uow.accounts
                )
            except ValidatorRuleException as e:
                log_error(
                    f"Account creation validation failed for {email}: {e.message}",
                    data=e.details,
                )
                raise

            hashed_password = self.password_hasher.hash(password)

            # The create method now returns the ORM object.
            new_account_orm = await uow.accounts.create(
                email=email, hashed_password=hashed_password
            )

            await uow.commit()
            created_account = await uow.accounts.get_by_id(new_account_orm.id)

        if not created_account:
            raise RuntimeError(
                f"FATAL: Newly created account for {email} could not be found."
            )

        log_info(f"Successfully created account {created_account.id} for {email}")
        return created_account
