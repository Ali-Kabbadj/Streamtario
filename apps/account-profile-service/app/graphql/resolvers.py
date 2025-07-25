from dependency_injector.wiring import inject, Provide
from app.containers import Container
from app.use_cases.profile.get_profile import GetProfileUseCase
from app.use_cases.account.create_account import CreateAccountUseCase
from domain_exceptions.exceptions import ValidatorRuleException
from .types import (
    ProfileType,
    CreateAccountInput,
    CreateAccountSuccess,
    CreateAccountError,
    AccountType,
)
import strawberry
from core.utils.logging import log_info


@inject
async def resolve_profile(
    id: strawberry.ID,
    use_case: GetProfileUseCase = Provide[Container.get_profile_use_case],
) -> ProfileType | None:
    log_info(f"GraphQL: Resolving profile with ID: {id}", context="graphql")
    # The use case returns a Pydantic domain model.
    pydantic_profile = await use_case.execute(profile_id=str(id))

    if not pydantic_profile:
        return None

    # We map the Pydantic model to the Strawberry GraphQL type.
    # This is the boundary between your internal domain and your public API.
    return ProfileType.from_pydantic(pydantic_profile)


@inject
async def resolve_create_account(
    input: CreateAccountInput,
    use_case: CreateAccountUseCase = Provide[Container.create_account_use_case],
) -> (
    CreateAccountSuccess | CreateAccountError
):  # CORRECTED: Use a proper type hint union
    log_info(
        f"GraphQL: Attempting to create account for email: {input.email}",
        context="graphql",
    )
    try:
        # The use case returns a Pydantic domain model.
        pydantic_account = await use_case.execute(
            email=input.email, password=input.password
        )

        # Convert Pydantic model to Strawberry type for the response
        account_type = AccountType.from_pydantic(pydantic_account)

        log_info(
            f"GraphQL: Successfully created account for {input.email}",
            context="graphql",
        )
        return CreateAccountSuccess(account=account_type)

    except ValidatorRuleException as e:
        log_info(
            f"GraphQL: Account creation failed for {input.email}: {e.message}",
            context="graphql",
        )

        # CORRECTED: Safely access the optional 'details' attribute.
        field = None
        if e.details and isinstance(e.details, dict):
            field = e.details.get("field")

        return CreateAccountError(message=e.ui_message, field=field)

    except Exception as e:
        log_info(
            f"GraphQL: An unexpected error occurred during account creation for {input.email}",
            context="graphql",
        )
        # In a real app, you might want to log the full exception `e`
        return CreateAccountError(message="An unexpected server error occurred.")
