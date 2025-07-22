import uuid
from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession
from core.pydantic.auth.user.account import Account, Profile
from core.utils.logging import log_info, log_error
from validation_factory.validators import run_validators, ValidatorException, IValidator
from typing import Optional, Sequence

from app.repositories.auth.account import AccountRepository, ProfileOrm, AccountOrm
from app.services.services import IAccountService
from app.validators.auth.account import PasswordStrengthValidator, UniqueEmailValidator
from security_factory.services.passwordservice import IPasswordHasher


class PostgresAccountService(IAccountService):
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
                password_validators: Sequence[IValidator] = [
                    PasswordStrengthValidator()
                ]
                email_validators: Sequence[IValidator] = [UniqueEmailValidator()]
                await run_validators(password, password_validators)
                await run_validators(email, email_validators, session=session)
            except ValidatorException as e:
                log_error(
                    f"Account creation validation failed for {email}: {e.message}",
                    data=e.details,
                )
                raise e

            # 1. CREATE THE CLEAN Pydantic DTO
            hashed_password_str = self.password_hasher.hash(password)
            default_profile_dto = Profile(name="Default")

            # --- THE FIX ---
            # Construct the Account DTO using the now-correct camelCase attribute name
            account_dto = Account(
                email=email,
                hashedPassword=hashed_password_str,
                profiles=[default_profile_dto],
            )

            # 2. MAP THE DTO TO ORM OBJECTS
            # Note: The ORM attribute is still 'hashed_password'
            new_account_orm = AccountOrm(
                id=account_dto.id,
                email=account_dto.email,
                hashed_password=account_dto.hashedPassword,
            )
            new_profile_orm = ProfileOrm(
                id=default_profile_dto.id,
                name=default_profile_dto.name,
                avatar=default_profile_dto.avatar,
                account_id=new_account_orm.id,
            )

            # 3. COMMIT
            session.add(new_account_orm)
            session.add(new_profile_orm)
            await session.commit()

            log_info(f"Successfully created account {account_dto.id} for {email}")

            # 4. RETURN THE DTO
            return account_dto

    async def get_account_by_id(self, account_id: str) -> Optional[Account]:
        async with self.session_factory() as session:
            repo = AccountRepository(session)
            account_orm = await repo.get_by_id(account_id)
            if account_orm:
                return Account.model_validate(account_orm)
            return None

    async def get_account_by_email(self, email: str) -> Optional[Account]:
        async with self.session_factory() as session:
            repo = AccountRepository(session)
            account_orm = await repo.get_by_email(email)
            if account_orm:
                return Account.model_validate(account_orm)
            return None

    async def add_profile_to_account(
        self, account_id: str, profile_name: str
    ) -> Profile:
        raise NotImplementedError
