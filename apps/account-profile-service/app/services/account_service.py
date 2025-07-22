from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession
from .services import IAccountService
from ..repositories.account_repository import AccountRepository
from core.pydantic.auth.user.account import Account
from core.utils.logging import log_error, log_info
from validation_factory.validators import run_validators, ValidatorException
from app.validators.account_validator import (
    PasswordStrengthValidator,
    UniqueEmailValidator,
)
from security_factory.services.passwordservice import IPasswordHasher
from typing import Optional


class AccountService(IAccountService):
    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession],
        password_hasher: IPasswordHasher,
    ):
        self.session_factory = session_factory
        self.password_hasher = password_hasher

    async def create_account(self, email: str, password: str) -> Account:
        async with self.session_factory() as session:
            try:
                await run_validators(password, [PasswordStrengthValidator()])
                await run_validators(email, [UniqueEmailValidator()], session=session)
            except ValidatorException as e:
                log_error(
                    f"Account creation validation failed for {email}: {e.message}",
                    data=e.details,
                )
                raise e

            hashed_password_str = self.password_hasher.hash(password)
            repo = AccountRepository(session)
            new_account_orm = await repo.create(
                email=email, hashed_password=hashed_password_str
            )

            from core.database.models.auth.account import ProfileOrm

            default_profile = ProfileOrm(name="Default", account_id=new_account_orm.id)
            session.add(default_profile)

            await session.commit()

            created_account_orm = await repo.get_by_id(new_account_orm.id)
            if not created_account_orm:
                error_msg = (
                    f"FATAL: Newly created account for {email} could not be found."
                )
                log_error(error_msg)
                raise RuntimeError(error_msg)

            log_info(
                f"Successfully created account {created_account_orm.id} for {email}"
            )
            return Account.model_validate(created_account_orm)

    async def get_account_by_id(self, account_id: str) -> Optional[Account]:
        async with self.session_factory() as session:
            repo = AccountRepository(session)
            account_orm = await repo.get_by_id(account_id)
            if account_orm:
                return Account.model_validate(account_orm)
            return None
