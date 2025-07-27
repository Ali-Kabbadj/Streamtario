from typing import Callable
from core.pydantic.domain.account import Account
from security_factory.services.passwordservice import IPasswordHasher
from domain_exceptions.exceptions import ApiException
from api_contract.errors import ApiErrorCode
from app.domain.interfaces.i_unit_of_work import IUnitOfWork
from core.utils.logging import log_info, log_warn


class LoginUseCase:
    """Handles user login with email and password."""

    def __init__(
        self,
        uow_factory: Callable[[], IUnitOfWork],
        password_hasher: IPasswordHasher,
    ):
        self.uow_factory = uow_factory
        self.password_hasher = password_hasher

    async def execute(self, email: str, password: str) -> Account:
        """
        Validates user credentials and returns the account on success.
        Raises an ApiException on failure.
        """
        log_info(f"Login attempt for email: {email}")

        async with self.uow_factory() as uow:
            account = await uow.accounts.get_by_email(email)

            if not account or not account.hashed_password:
                log_warn(f"Login failed: No account or password found for {email}.")
                raise ApiException(ApiErrorCode.INVALID_CREDENTIALS)

            is_password_valid = self.password_hasher.verify(
                account.hashed_password, password
            )

            if not is_password_valid:
                log_warn(f"Login failed: Invalid password for {email}.")
                raise ApiException(ApiErrorCode.INVALID_CREDENTIALS)

        log_info(f"Successfully authenticated user {account.id} ({account.email})")
        return account
