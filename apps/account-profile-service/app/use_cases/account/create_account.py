from typing import Callable
from core.pydantic.domain.account import Account
from security_factory.services.passwordservice import IPasswordHasher
from validation_factory.validators import run_validators
from domain_exceptions.exceptions import ApiException
from api_contract.errors import ApiErrorCode
from app.domain.events.i_event_publisher import IEventPublisher
from app.domain.interfaces.i_unit_of_work import IUnitOfWork
from app.validators.account_validator import (
    PasswordStrengthValidator,
    UniqueEmailValidator,
)
from core.utils.logging import log_error, log_info
from core.pydantic.events.base import AccountCreatedEvent


class CreateAccountUseCase:

    def __init__(
        self,
        uow_factory: Callable[[], IUnitOfWork],
        password_hasher: IPasswordHasher,
        event_publisher: IEventPublisher,
    ):
        self.uow_factory = uow_factory
        self.password_hasher = password_hasher
        self.event_publisher = event_publisher

    async def execute(self, email: str, password: str) -> Account:
        async with self.uow_factory() as uow:
            try:
                await run_validators(password, [PasswordStrengthValidator()])
                await run_validators(
                    email, [UniqueEmailValidator()], account_repository=uow.accounts
                )
            except ApiException as e:
                log_error(
                    f"Account creation validation failed for {email}: {e.message}",
                    data=e.details,
                )
                raise e

            hashed_password = self.password_hasher.hash(password)

            new_account_orm = await uow.accounts.create(
                email=email, hashed_password=hashed_password
            )

            await uow.commit()
            created_account = await uow.accounts.get_by_id(new_account_orm.id)

        if not created_account:
            raise ApiException(
                ApiErrorCode.UNEXPECTED_ERROR,
                override_message=f"FATAL: Newly created account for {email} could not be found.",
            )

        await self.event_publisher.publish(
            AccountCreatedEvent(
                account_id=created_account.id,
                email=created_account.email,
                provider="password",
            )
        )

        log_info(f"Successfully created account {created_account.id} for {email}")
        return created_account
