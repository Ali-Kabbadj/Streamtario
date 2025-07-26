# /apps/account-profile-service/app/graphql/resolvers.py

from dependency_injector.wiring import inject, Provide
from app.containers import Container
from app.use_cases.profile.get_profile import GetProfileUseCase
from app.use_cases.account.create_account import CreateAccountUseCase
from app.use_cases.profile.install_addon import InstallAddonUseCase
from app.use_cases.profile.uninstall_addon import UninstallAddonUseCase
from domain_exceptions.exceptions import (
    ValidatorRuleException,
    NotFoundException,
    ConflictException,
    ApiException,
)
from .types import (
    ProfileType,
    CreateAccountInput,
    CreateAccountSuccess,
    CreateAccountError,
    AccountType,
    InstallAddonInput,
    InstallAddonSuccess,
    InstallAddonError,
    InstalledAddonType,
    UninstallAddonInput,
    UninstallAddonSuccess,
    UninstallAddonError,
)
import strawberry
from core.utils.logging import log_info, log_error


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


@inject
async def resolve_install_addon(
    input: InstallAddonInput,
    use_case: InstallAddonUseCase = Provide[Container.install_addon_use_case],
) -> InstallAddonSuccess | InstallAddonError:
    log_info(
        f"GraphQL: Installing addon from {input.manifest_url} for profile {input.profile_id}",
        context="graphql",
    )
    try:
        pydantic_addon = await use_case.execute(
            profile_id=str(input.profile_id), manifest_url=input.manifest_url
        )
        addon_type = InstalledAddonType.from_pydantic(pydantic_addon)
        return InstallAddonSuccess(addon=addon_type)
    except (NotFoundException, ConflictException, ApiException) as e:
        log_error(
            f"GraphQL: Failed to install addon for profile {input.profile_id}",
            data={"error": e.message},
        )
        return InstallAddonError(message=e.ui_message, profile_id=input.profile_id)
    except Exception as e:
        log_error(
            f"GraphQL: Unexpected error installing addon for profile {input.profile_id}",
            data={"error": str(e)},
        )
        return InstallAddonError(
            message="An unexpected server error occurred.", profile_id=input.profile_id
        )


@inject
async def resolve_uninstall_addon(
    input: UninstallAddonInput,
    use_case: UninstallAddonUseCase = Provide[Container.uninstall_addon_use_case],
) -> UninstallAddonSuccess | UninstallAddonError:
    log_info(
        f"GraphQL: Uninstalling addon {input.manifest_id} from profile {input.profile_id}",
        context="graphql",
    )
    try:
        await use_case.execute(
            profile_id=str(input.profile_id), manifest_id=input.manifest_id
        )
        return UninstallAddonSuccess(
            success=True, profile_id=input.profile_id, manifest_id=input.manifest_id
        )
    except NotFoundException as e:
        log_error(
            f"GraphQL: Failed to uninstall addon {input.manifest_id} from profile {input.profile_id}",
            data={"error": e.message},
        )
        return UninstallAddonError(
            message=e.ui_message,
            profile_id=input.profile_id,
            manifest_id=input.manifest_id,
        )
    except Exception as e:
        log_error(
            f"GraphQL: Unexpected error uninstalling addon for profile {input.profile_id}",
            data={"error": str(e)},
        )
        return UninstallAddonError(
            message="An unexpected server error occurred.",
            profile_id=input.profile_id,
            manifest_id=input.manifest_id,
        )
