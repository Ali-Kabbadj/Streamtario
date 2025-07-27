from dependency_injector.wiring import inject, Provide
from strawberry.types import Info

from app.security.dependencies import get_current_user_payload
from security.schemas import TokenPayload
from app.containers import Container
from app.use_cases.account.get_account import GetAccountUseCase
from app.use_cases.profile.get_profile import GetProfileUseCase
from app.use_cases.account.create_account import CreateAccountUseCase
from app.use_cases.profile.install_addon import InstallAddonUseCase
from app.use_cases.profile.install_addon_for_all_profiles import (
    InstallAddonForAllProfilesUseCase,
)
from app.use_cases.profile.uninstall_addon import UninstallAddonUseCase
from app.use_cases.profile.create_profile import CreateProfileUseCase
from app.use_cases.profile.uninstall_addon_from_all_profiles import (
    UninstallAddonFromAllProfilesUseCase,
)
from app.use_cases.profile.update_profile import UpdateProfileUseCase
from domain_exceptions.exceptions import (
    ValidatorRuleException,
    NotFoundException,
    ConflictException,
    ApiException,
    ValidationException,
)
from .types import (
    InstallAddonForAllProfilesError,
    InstallAddonForAllProfilesInput,
    InstallAddonForAllProfilesSuccess,
    ProfileType,
    CreateAccountInput,
    CreateAccountSuccess,
    CreateAccountError,
    AccountType,
    InstallAddonInput,
    InstallAddonSuccess,
    InstallAddonError,
    InstalledAddonType,
    UninstallAddonFromAllProfilesError,
    UninstallAddonFromAllProfilesInput,
    UninstallAddonFromAllProfilesSuccess,
    UninstallAddonInput,
    UninstallAddonSuccess,
    UninstallAddonError,
    CreateProfileInput,
    CreateProfileSuccess,
    CreateProfileError,
    UpdateProfileInput,
    UpdateProfileSuccess,
    UpdateProfileError,
)
import strawberry
from core.utils.logging import log_info, log_error


@inject
async def resolve_profile(
    id: strawberry.ID,
    use_case: GetProfileUseCase = Provide[Container.get_profile_use_case],
) -> ProfileType | None:
    pydantic_profile = await use_case.execute(profile_id=str(id))
    if not pydantic_profile:
        return None
    return ProfileType.from_pydantic(pydantic_profile)


@inject
async def resolve_create_account(
    input: CreateAccountInput,
    use_case: CreateAccountUseCase = Provide[Container.create_account_use_case],
) -> CreateAccountSuccess | CreateAccountError:
    try:
        pydantic_account = await use_case.execute(
            email=input.email, password=input.password
        )
        account_type = AccountType.from_pydantic(pydantic_account)
        return CreateAccountSuccess(account=account_type)
    except ValidatorRuleException as e:
        field = e.details.get("field") if isinstance(e.details, dict) else None
        return CreateAccountError(message=e.ui_message, field=field)
    except Exception:
        return CreateAccountError(message="An unexpected server error occurred.")


@inject
async def resolve_create_profile(
    info: Info,
    input: CreateProfileInput,
    use_case: CreateProfileUseCase = Provide[Container.create_profile_use_case],
) -> CreateProfileSuccess | CreateProfileError:
    try:
        current_user: TokenPayload = get_current_user_payload(info.context["request"])
        account_id = current_user.sub

        log_info(
            f"GraphQL: Creating profile '{input.name}' for account {account_id}",
            context="graphql",
        )

        pydantic_profile = await use_case.execute(
            account_id=account_id,
            name=input.name,
            avatar=input.avatar,
            is_private=input.is_private,
            pin=input.pin,
        )
        profile_type = ProfileType.from_pydantic(pydantic_profile)
        return CreateProfileSuccess(profile=profile_type)
    except (
        ValidationException,
        NotFoundException,
        ConflictException,
        ApiException,
    ) as e:
        log_error(f"GraphQL: Profile creation failed: {e.message}", data=e.details)
        field = e.details.get("field") if isinstance(e.details, dict) else None
        return CreateProfileError(message=e.ui_message, field=field)
    except Exception as e:
        log_error(
            "GraphQL: Unexpected error during profile creation", data={"error": str(e)}
        )
        return CreateProfileError(message="An unexpected server error occurred.")


@inject
async def resolve_update_profile(
    info: Info,
    input: UpdateProfileInput,
    use_case: UpdateProfileUseCase = Provide[Container.update_profile_use_case],
) -> UpdateProfileSuccess | UpdateProfileError:
    try:
        current_user: TokenPayload = get_current_user_payload(info.context["request"])
        log_info(f"GraphQL: Updating profile {input.profile_id}", context="graphql")

        pydantic_profile = await use_case.execute(
            requesting_account_id=current_user.sub,
            profile_id=str(input.profile_id),
            name=input.name,
            avatar=input.avatar,
            is_private=input.is_private,
            pin=input.pin,
        )
        profile_type = ProfileType.from_pydantic(pydantic_profile)
        return UpdateProfileSuccess(profile=profile_type)
    except (ValidationException, NotFoundException, ApiException) as e:
        log_error(f"GraphQL: Profile update failed: {e.message}", data=e.details)
        field = e.details.get("field") if isinstance(e.details, dict) else None
        return UpdateProfileError(message=e.ui_message, field=field)
    except Exception as e:
        log_error(
            "GraphQL: Unexpected error during profile update", data={"error": str(e)}
        )
        return UpdateProfileError(message="An unexpected server error occurred.")


@inject
async def resolve_install_addon(
    info: Info,
    input: InstallAddonInput,
    use_case: InstallAddonUseCase = Provide[Container.install_addon_use_case],
) -> InstallAddonSuccess | InstallAddonError:
    try:
        current_user: TokenPayload = get_current_user_payload(info.context["request"])
        log_info(
            f"GraphQL: Installing addon from {input.manifest_url} for profile {input.profile_id}",
            context="graphql",
        )

        pydantic_addon = await use_case.execute(
            requesting_account_id=current_user.sub,
            profile_id=str(input.profile_id),
            manifest_url=input.manifest_url,
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
    info: Info,
    input: UninstallAddonInput,
    use_case: UninstallAddonUseCase = Provide[Container.uninstall_addon_use_case],
) -> UninstallAddonSuccess | UninstallAddonError:
    try:
        current_user: TokenPayload = get_current_user_payload(info.context["request"])
        log_info(
            f"GraphQL: Uninstalling addon {input.manifest_id} from profile {input.profile_id}",
            context="graphql",
        )

        await use_case.execute(
            requesting_account_id=current_user.sub,
            profile_id=str(input.profile_id),
            manifest_id=input.manifest_id,
        )
        return UninstallAddonSuccess(
            success=True, profile_id=input.profile_id, manifest_id=input.manifest_id
        )
    except (NotFoundException, ApiException) as e:
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


@inject
async def resolve_install_addon_for_all_profiles(
    info: Info,
    input: InstallAddonForAllProfilesInput,
    use_case: InstallAddonForAllProfilesUseCase = Provide[
        Container.install_addon_for_all_profiles_use_case
    ],
) -> InstallAddonForAllProfilesSuccess | InstallAddonForAllProfilesError:
    try:
        current_user: TokenPayload = get_current_user_payload(info.context["request"])
        summary = await use_case.execute(current_user.sub, input.manifest_url)
        return InstallAddonForAllProfilesSuccess(summary=summary)
    except (NotFoundException, ValidationException, ConflictException) as e:
        return InstallAddonForAllProfilesError(message=e.ui_message, error=e)
    except Exception as e:
        log_error(
            "GraphQL: Unexpected error during account-wide addon install",
            data={"error": str(e)},
        )
        return InstallAddonForAllProfilesError(
            message="Unexpected error during account-wide addon install", error=e
        )


@inject
async def resolve_uninstall_addon_from_all_profiles(
    info: Info,
    input: UninstallAddonFromAllProfilesInput,
    use_case: UninstallAddonFromAllProfilesUseCase = Provide[
        Container.uninstall_addon_from_all_profiles_use_case
    ],
) -> UninstallAddonFromAllProfilesSuccess | UninstallAddonFromAllProfilesError:
    try:
        current_user: TokenPayload = get_current_user_payload(info.context["request"])
        summary = await use_case.execute(current_user.sub, input.manifest_id)
        return UninstallAddonFromAllProfilesSuccess(summary=summary)
    except NotFoundException as e:
        return UninstallAddonFromAllProfilesError(message=e.ui_message)
    except Exception as e:
        log_error(
            "GraphQL: Unexpected error during account-wide addon uninstall",
            data={"error": str(e)},
        )
        return UninstallAddonFromAllProfilesError(
            message="An unexpected server error occurred."
        )


@inject
async def resolve_account(
    info: Info,
    use_case: GetAccountUseCase = Provide[Container.get_account_use_case],
) -> AccountType | None:
    try:
        current_user: TokenPayload = get_current_user_payload(info.context["request"])
        account_id = current_user.sub

        log_info(
            f"GraphQL: Fetching account details for {account_id}", context="graphql"
        )

        pydantic_account = await use_case.execute(account_id=account_id)
        if not pydantic_account:
            return None
        return AccountType.from_pydantic(pydantic_account)
    except ApiException:
        return None
    except Exception as e:
        log_error(
            "GraphQL: Unexpected error during myAccount resolution",
            data={"error": str(e)},
        )
        return None
