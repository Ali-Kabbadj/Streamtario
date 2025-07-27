from typing import Callable, Literal
from core.pydantic.domain.account import Account
from domain_exceptions.exceptions import ConflictException
from app.domain.interfaces.i_unit_of_work import IUnitOfWork
from core.utils.logging import log_info
from core.pydantic.api.account_api import SocialProvider


class FindOrCreateBySocialUseCase:
    """Finds an account by social ID, or creates a new one if it doesn't exist."""

    def __init__(self, uow_factory: Callable[[], IUnitOfWork]):
        self.uow_factory = uow_factory

    async def execute(
        self, provider: SocialProvider, social_id: str, email: str
    ) -> Account:
        log_info(
            f"Attempting to find or create user via {provider} for social ID {social_id}"
        )

        async with self.uow_factory() as uow:
            account: Account | None = None
            # 1. Try to find user by their social ID
            if provider == "google":
                account = await uow.accounts.get_by_google_id(social_id)
            elif provider == "facebook":
                account = await uow.accounts.get_by_facebook_id(social_id)

            if account:
                log_info(f"Found existing account {account.id} via {provider} ID.")
                return account

            # 2. If not found, check if an account with that email already exists
            account_by_email = await uow.accounts.get_by_email(email)
            if account_by_email:
                # This logic can be adjusted based on business rules.
                # Here, we prevent linking if the email is already taken by a non-social account.
                if account_by_email.hashed_password:
                    raise ConflictException(
                        "Email",
                        email,
                        details={
                            "reason": "Email is already registered with a password."
                        },
                    )
                # If we wanted to allow linking, we would update the existing account with the social ID here.

            # 3. If no account exists, create a new one.
            log_info(
                f"No existing account found. Creating new account for email {email} with {provider} ID."
            )
            orm_account = await uow.accounts.create(
                email=email,
                google_id=social_id if provider == "google" else None,
                facebook_id=social_id if provider == "facebook" else None,
            )
            # A default profile is no longer created automatically. The user will be prompted to create one.
            await uow.commit()

            # Retrieve the full account model after creation
            created_account = await uow.accounts.get_by_id(orm_account.id)
            if not created_account:
                raise RuntimeError("Failed to retrieve newly created social account.")

            return created_account
