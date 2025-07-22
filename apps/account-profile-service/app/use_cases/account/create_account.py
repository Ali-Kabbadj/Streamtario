from typing import Callable, Awaitable
from core.pydantic.domain.account import Account
from security_factory.services.passwordservice import IPasswordHasher
from validation_factory.validators import run_validators, ValidatorException
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
        account_id = None
        async with self.uow_factory() as uow:
            try:
                await run_validators(password, [PasswordStrengthValidator()])
                await run_validators(
                    email, [UniqueEmailValidator()], account_repository=uow.accounts
                )
            except ValidatorException as e:
                await uow.rollback()
                log_error(
                    f"Account creation validation failed for {email}: {e.message}",
                    data=e.details,
                )
                raise

            hashed_password = self.password_hasher.hash(password)
            new_account_orm = await uow.accounts.create(
                email=email, hashed_password=hashed_password
            )
            await uow.profiles.create_default_for_account(new_account_orm.id)
            await uow.commit()
            account_id = new_account_orm.id

        if not account_id:
            raise RuntimeError("Failed to create account and get an ID.")

        async with self.uow_factory() as uow:
            created_account = await uow.accounts.get_by_id(account_id)

        if not created_account:
            raise RuntimeError(
                f"FATAL: Newly created account for {email} could not be found."
            )

        log_info(f"Successfully created account {created_account.id} for {email}")
        return created_account
