from typing import List
from dependency_injector.wiring import inject, Provide
from strawberry.types import Info
import strawberry

from app.security.dependencies import get_current_user_payload
from security.schemas import TokenPayload
from app.containers import Container
from app.use_cases.account.get_account import GetAccountUseCase
from app.use_cases.profile.get_playback_history import GetPlaybackHistoryUseCase
from app.use_cases.profile.get_continue_watching import GetContinueWatchingUseCase
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
from app.use_cases.profile.update_playback_history import UpdatePlaybackHistoryUseCase
from app.use_cases.profile.update_profile import UpdateProfileUseCase
from app.use_cases.profile.update_profile_settings import UpdateProfileSettingsUseCase
from app.use_cases.profile.verify_profile_pin import VerifyProfilePinUseCase
from domain_exceptions.exceptions import ApiException
from api_contract.errors import ApiErrorCode
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
    CreateProfileInput,
    CreateProfileSuccess,
    CreateProfileError,
    UpdateProfileInput,
    UpdateProfileSuccess,
    UpdateProfileError,
    UpdateProfileSettingsInput,
    UpdateProfileSettingsSuccess,
    UpdateProfileSettingsError,
    VerifyProfilePinInput,
    VerifyProfilePinSuccess,
    VerifyProfilePinError,
    PlaybackHistoryType,
    UpdatePlaybackHistoryInput,
    InstallAddonForAllProfilesError,
    InstallAddonForAllProfilesInput,
    InstallAddonForAllProfilesSuccess,
    UninstallAddonFromAllProfilesError,
    UninstallAddonFromAllProfilesInput,
    UninstallAddonFromAllProfilesSuccess,
)
from core.utils.logging import log_info, log_error

# --- QUERIES ---


@inject
async def resolve_continue_watching(
    info: Info,
    profile_id: strawberry.ID,
    use_case: GetContinueWatchingUseCase = Provide[
        Container.get_continue_watching_use_case
    ],
) -> List[PlaybackHistoryType]:
    current_user: TokenPayload = get_current_user_payload(info.context["request"])
    history_items = await use_case.execute(
        requesting_account_id=current_user.sub, profile_id=str(profile_id)
    )
    return [PlaybackHistoryType.from_pydantic(item) for item in history_items]


@inject
async def resolve_playback_history_by_imdb_id(
    info: Info,
    profile_id: strawberry.ID,
    imdb_id: str,
    use_case: GetPlaybackHistoryUseCase = Provide[
        Container.get_playback_history_use_case
    ],
) -> List[PlaybackHistoryType]:
    current_user: TokenPayload = get_current_user_payload(info.context["request"])
    history_items = await use_case.execute(
        requesting_account_id=current_user.sub,
        profile_id=str(profile_id),
        imdb_id=imdb_id,
    )
    return [PlaybackHistoryType.from_pydantic(item) for item in history_items]


@inject
async def resolve_profile(
    id: strawberry.ID,
    info: Info,
    use_case: GetProfileUseCase = Provide[Container.get_profile_use_case],
) -> ProfileType | None:
    current_user_payload = None
    try:
        current_user_payload = get_current_user_payload(info.context["request"])
    except ApiException:
        pass
    pydantic_profile = await use_case.execute(
        profile_id=str(id),
        requesting_account_id=(
            current_user_payload.sub if current_user_payload else None
        ),
    )
    return ProfileType.from_pydantic(pydantic_profile) if pydantic_profile else None


@inject
async def resolve_account(
    info: Info,
    use_case: GetAccountUseCase = Provide[Container.get_account_use_case],
) -> AccountType | None:
    current_user: TokenPayload = get_current_user_payload(info.context["request"])
    account_id = current_user.sub
    log_info(f"GraphQL: Fetching account details for {account_id}", context="graphql")
    pydantic_account = await use_case.execute(account_id=account_id)
    return AccountType.from_pydantic(pydantic_account) if pydantic_account else None


# --- MUTATIONS ---


@inject
async def resolve_update_playback_history(
    info: Info,
    input: UpdatePlaybackHistoryInput,
    use_case: UpdatePlaybackHistoryUseCase = Provide[
        Container.update_playback_history_use_case
    ],
) -> PlaybackHistoryType:
    current_user: TokenPayload = get_current_user_payload(info.context["request"])
    history_item = await use_case.execute(
        requesting_account_id=current_user.sub,
        profile_id=str(input.profile_id),
        content_id=input.content_id,
        item_type=input.item_type,
        position_seconds=input.position_seconds,
        duration_seconds=input.duration_seconds,
        last_stream_details=input.last_stream_details,
    )
    return PlaybackHistoryType.from_pydantic(history_item)


# ... (All other mutation resolvers: create_profile, update_profile, etc. should be here)
# For brevity, I am omitting them, but they must be present in your file.
@inject
async def resolve_create_profile(
    info: Info,
    input: CreateProfileInput,
    use_case: CreateProfileUseCase = Provide[Container.create_profile_use_case],
) -> CreateProfileSuccess | CreateProfileError:
    current_user: TokenPayload = get_current_user_payload(info.context["request"])

    try:
        pydantic_profile = await use_case.execute(
            account_id=current_user.sub,
            name=input.name,
            avatar=input.avatar,
            is_private=input.is_private,
            pin=input.pin,
        )
        return CreateProfileSuccess(profile=ProfileType.from_pydantic(pydantic_profile))
    except ApiException as e:
        field = e.details.get("field") if isinstance(e.details, dict) else None
        return CreateProfileError(code=e.code, message=e.ui_message, field=field)
    except Exception as e:
        e_code = ApiErrorCode.UNEXPECTED_ERROR
        log_error(
            "GraphQL: Unexpected error during profile creation", data={"error": str(e)}
        )
        return CreateProfileError(code=e_code.name, message=e_code.value.ui_message)


@inject
async def resolve_update_profile(
    info: Info,
    input: UpdateProfileInput,
    use_case: UpdateProfileUseCase = Provide[Container.update_profile_use_case],
) -> UpdateProfileSuccess | UpdateProfileError:
    current_user: TokenPayload = get_current_user_payload(info.context["request"])

    try:
        pydantic_profile = await use_case.execute(
            requesting_account_id=current_user.sub,
            profile_id=str(input.profile_id),
            name=input.name,
            avatar=input.avatar,
            is_private=input.is_private,
            pin=input.pin,
        )
        return UpdateProfileSuccess(profile=ProfileType.from_pydantic(pydantic_profile))
    except ApiException as e:
        field = e.details.get("field") if isinstance(e.details, dict) else None
        return UpdateProfileError(code=e.code, message=e.ui_message, field=field)
    except Exception as e:
        e_code = ApiErrorCode.UNEXPECTED_ERROR
        log_error(
            "GraphQL: Unexpected error during profile update", data={"error": str(e)}
        )
        return UpdateProfileError(code=e_code.name, message=e_code.value.ui_message)


@inject
async def resolve_update_profile_settings(
    info: Info,
    input: UpdateProfileSettingsInput,
    use_case: UpdateProfileSettingsUseCase = Provide[
        Container.update_profile_settings_use_case
    ],
) -> UpdateProfileSettingsSuccess | UpdateProfileSettingsError:
    current_user: TokenPayload = get_current_user_payload(info.context["request"])
    try:
        updated_profile = await use_case.execute(
            requesting_account_id=current_user.sub,
            profile_id=str(input.profile_id),
            settings=input.settings,
        )
        return UpdateProfileSettingsSuccess(
            profile=ProfileType.from_pydantic(updated_profile)
        )
    except ApiException as e:
        return UpdateProfileSettingsError(code=e.code, message=e.ui_message)
    except Exception as e:
        e_code = ApiErrorCode.UNEXPECTED_ERROR
        log_error(
            "GraphQL: Unexpected error during profile settings update",
            data={"error": str(e)},
        )
        return UpdateProfileSettingsError(
            code=e_code.name, message=e_code.value.ui_message
        )


@inject
async def resolve_verify_profile_pin(
    info: Info,
    input: VerifyProfilePinInput,
    use_case: VerifyProfilePinUseCase = Provide[Container.verify_profile_pin_use_case],
) -> VerifyProfilePinSuccess | VerifyProfilePinError:
    current_user: TokenPayload = get_current_user_payload(info.context["request"])

    try:
        success = await use_case.execute(
            requesting_account_id=current_user.sub,
            profile_id=str(input.profile_id),
            pin=input.pin,
        )
        return VerifyProfilePinSuccess(success=success)
    except ApiException as e:
        return VerifyProfilePinError(code=e.code, message=e.ui_message)
    except Exception as e:
        e_code = ApiErrorCode.UNEXPECTED_ERROR
        log_error(
            "GraphQL: Unexpected error during PIN verification", data={"error": str(e)}
        )
        return VerifyProfilePinError(code=e_code.name, message=e_code.value.ui_message)


@inject
async def resolve_install_addon(
    info: Info,
    input: InstallAddonInput,
    use_case: InstallAddonUseCase = Provide[Container.install_addon_use_case],
) -> InstallAddonSuccess | InstallAddonError:
    current_user: TokenPayload = get_current_user_payload(info.context["request"])

    try:
        pydantic_addon = await use_case.execute(
            requesting_account_id=current_user.sub,
            profile_id=str(input.profile_id),
            manifest_url=input.manifest_url,
        )
        return InstallAddonSuccess(
            addon=InstalledAddonType.from_pydantic(pydantic_addon)
        )
    except ApiException as e:
        return InstallAddonError(
            code=e.code, message=e.ui_message, profile_id=input.profile_id
        )
    except Exception as e:
        e_code = ApiErrorCode.UNEXPECTED_ERROR
        log_error("GraphQL: Unexpected error installing addon", data={"error": str(e)})
        return InstallAddonError(
            code=e_code.name,
            message=e_code.value.ui_message,
            profile_id=input.profile_id,
        )


@inject
async def resolve_uninstall_addon(
    info: Info,
    input: UninstallAddonInput,
    use_case: UninstallAddonUseCase = Provide[Container.uninstall_addon_use_case],
) -> UninstallAddonSuccess | UninstallAddonError:
    current_user: TokenPayload = get_current_user_payload(info.context["request"])

    try:
        await use_case.execute(
            requesting_account_id=current_user.sub,
            profile_id=str(input.profile_id),
            manifest_id=input.manifest_id,
        )
        return UninstallAddonSuccess(
            success=True, profile_id=input.profile_id, manifest_id=input.manifest_id
        )
    except ApiException as e:
        return UninstallAddonError(
            code=e.code,
            message=e.ui_message,
            profile_id=input.profile_id,
            manifest_id=input.manifest_id,
        )
    except Exception as e:
        e_code = ApiErrorCode.UNEXPECTED_ERROR
        log_error(
            "GraphQL: Unexpected error uninstalling addon", data={"error": str(e)}
        )
        return UninstallAddonError(
            code=e_code.name,
            message=e_code.value.ui_message,
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
    current_user: TokenPayload = get_current_user_payload(info.context["request"])

    try:
        summary = await use_case.execute(current_user.sub, input.manifest_url)
        return InstallAddonForAllProfilesSuccess(summary=summary)
    except ApiException as e:
        return InstallAddonForAllProfilesError(
            code=e.code, message=e.ui_message, error=e.details
        )
    except Exception as e:
        e_code = ApiErrorCode.UNEXPECTED_ERROR
        log_error(
            "GraphQL: Unexpected error during account-wide install",
            data={"error": str(e)},
        )
        return InstallAddonForAllProfilesError(
            code=e_code.name, message=e_code.value.ui_message, error={"error": str(e)}
        )


@inject
async def resolve_uninstall_addon_from_all_profiles(
    info: Info,
    input: UninstallAddonFromAllProfilesInput,
    use_case: UninstallAddonFromAllProfilesUseCase = Provide[
        Container.uninstall_addon_from_all_profiles_use_case
    ],
) -> UninstallAddonFromAllProfilesSuccess | UninstallAddonFromAllProfilesError:
    current_user: TokenPayload = get_current_user_payload(info.context["request"])

    try:
        summary = await use_case.execute(current_user.sub, input.manifest_id)
        return UninstallAddonFromAllProfilesSuccess(summary=summary)
    except ApiException as e:
        return UninstallAddonFromAllProfilesError(code=e.code, message=e.ui_message)
    except Exception as e:
        e_code = ApiErrorCode.UNEXPECTED_ERROR
        log_error(
            "GraphQL: Unexpected error during account-wide uninstall",
            data={"error": str(e)},
        )
        return UninstallAddonFromAllProfilesError(
            code=e_code.name, message=e_code.value.ui_message
        )


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
    except ApiException as e:
        field = e.details.get("field") if isinstance(e.details, dict) else None
        return CreateAccountError(code=e.code, message=e.ui_message, field=field)
    except Exception:
        e_code = ApiErrorCode.UNEXPECTED_ERROR
        return CreateAccountError(code=e_code.name, message=e_code.value.ui_message)
