import strawberry
from typing import List, Dict, Any
from strawberry.fastapi import GraphQLRouter
from strawberry.types import Info, ExecutionResult
from strawberry.http import GraphQLHTTPResponse
from graphql import GraphQLError
from fastapi import Request, Response
from .types import (
    AccountType,
    CreateAccountError,
    CreateAccountInput,
    CreateAccountSuccess,
    CreateProfileError,
    CreateProfileInput,
    CreateProfileSuccess,
    InstallAddonForAllProfilesError,
    InstallAddonForAllProfilesInput,
    InstallAddonForAllProfilesSuccess,
    InstallAddonError,
    InstallAddonInput,
    InstallAddonSuccess,
    ProfileType,
    UninstallAddonFromAllProfilesError,
    UninstallAddonFromAllProfilesInput,
    UninstallAddonFromAllProfilesSuccess,
    UninstallAddonError,
    UninstallAddonInput,
    UninstallAddonSuccess,
    UpdateAdvancedSettingsError,
    UpdateAdvancedSettingsInput,
    UpdateAdvancedSettingsSuccess,
    UpdateProfileError,
    UpdateProfileInput,
    UpdateProfileSuccess,
    UpdateProfileSettingsInput,
    UpdateProfileSettingsSuccess,
    UpdateProfileSettingsError,
    VerifyProfilePinError,
    VerifyProfilePinInput,
    VerifyProfilePinSuccess,
    PlaybackHistoryType,
    UpdatePlaybackHistoryInput,
)
from .resolvers import (
    resolve_account,
    resolve_create_account,
    resolve_create_profile,
    resolve_install_addon,
    resolve_install_addon_for_all_profiles,
    resolve_playback_history_by_imdb_id,
    resolve_profile,
    resolve_uninstall_addon,
    resolve_uninstall_addon_from_all_profiles,
    resolve_update_advanced_settings,
    resolve_update_profile,
    resolve_update_profile_settings,
    resolve_verify_profile_pin,
    resolve_update_playback_history,
)
from domain_exceptions.exceptions import ApiException
from api_contract.errors import ApiErrorCode


def format_graphql_error(error: GraphQLError, debug: bool = False) -> Dict[str, Any]:
    if isinstance(error.original_error, ApiException):
        exc = error.original_error
        return {
            "message": exc.ui_message,
            "path": error.path,
            "locations": error.locations,
            "extensions": {"code": exc.code, "details": exc.details},
        }
    if debug:
        return {
            "message": str(error.original_error),
            "path": error.path,
            "locations": error.locations,
            "extensions": {
                "code": "UNEXPECTED_PYTHON_ERROR",
                "exception_type": type(error.original_error).__name__,
            },
        }
    e_code = ApiErrorCode.UNEXPECTED_ERROR
    return {
        "message": e_code.value.ui_message,
        "path": error.path,
        "locations": error.locations,
        "extensions": {"code": e_code.name},
    }


@strawberry.input
class ProfileRepresentation:
    id: strawberry.ID
    __typename: str  # type: ignore


@strawberry.type
class Query:
    @strawberry.field
    async def profile(self, id: strawberry.ID, info: Info) -> ProfileType | None:
        return await resolve_profile(id=id, info=info)

    @strawberry.field
    async def account(self, info: Info) -> AccountType | None:
        return await resolve_account(info)

    @strawberry.field(name="_entities")
    async def resolve_entities(
        self, representations: List[ProfileRepresentation], info: Info
    ) -> List[ProfileType | None]:
        results: List[ProfileType | None] = []
        for rep in representations:
            if rep.__typename == "Profile":
                profile = await resolve_profile(id=rep.id, info=info)
                results.append(profile)
        return results

    @strawberry.field
    async def playbackHistoryByImdbId(
        self,
        info: Info,
        profile_id: strawberry.ID,
        imdb_id: str,
    ) -> List[PlaybackHistoryType]:
        return await resolve_playback_history_by_imdb_id(info, profile_id, imdb_id)


@strawberry.type
class Mutation:

    @strawberry.mutation
    async def update_playback_history(
        self, info: Info, input: UpdatePlaybackHistoryInput
    ) -> PlaybackHistoryType:
        return await resolve_update_playback_history(info, input)

    @strawberry.mutation
    async def create_account(
        self, input: CreateAccountInput
    ) -> CreateAccountSuccess | CreateAccountError:
        return await resolve_create_account(input)

    @strawberry.mutation
    async def create_profile(
        self, info: Info, input: CreateProfileInput
    ) -> CreateProfileSuccess | CreateProfileError:
        return await resolve_create_profile(info, input)

    @strawberry.mutation
    async def update_profile(
        self, info: Info, input: UpdateProfileInput
    ) -> UpdateProfileSuccess | UpdateProfileError:
        return await resolve_update_profile(info, input)

    @strawberry.mutation
    async def update_profile_settings(
        self, info: Info, input: UpdateProfileSettingsInput
    ) -> UpdateProfileSettingsSuccess | UpdateProfileSettingsError:
        return await resolve_update_profile_settings(info, input)

    @strawberry.mutation
    async def verify_profile_pin(
        self, info: Info, input: VerifyProfilePinInput
    ) -> VerifyProfilePinSuccess | VerifyProfilePinError:
        return await resolve_verify_profile_pin(info, input)

    @strawberry.mutation
    async def install_addon(
        self, info: Info, input: InstallAddonInput
    ) -> InstallAddonSuccess | InstallAddonError:
        return await resolve_install_addon(info, input)

    @strawberry.mutation
    async def uninstall_addon(
        self, info: Info, input: UninstallAddonInput
    ) -> UninstallAddonSuccess | UninstallAddonError:
        return await resolve_uninstall_addon(info, input)

    @strawberry.mutation
    async def install_addon_for_all_profiles(
        self, info: Info, input: InstallAddonForAllProfilesInput
    ) -> InstallAddonForAllProfilesSuccess | InstallAddonForAllProfilesError:
        return await resolve_install_addon_for_all_profiles(info, input)

    @strawberry.mutation
    async def uninstall_addon_from_all_profiles(
        self, info: Info, input: UninstallAddonFromAllProfilesInput
    ) -> UninstallAddonFromAllProfilesSuccess | UninstallAddonFromAllProfilesError:
        return await resolve_uninstall_addon_from_all_profiles(info, input)

    @strawberry.mutation
    async def update_advanced_settings(
        self, info: Info, input: UpdateAdvancedSettingsInput
    ) -> UpdateAdvancedSettingsSuccess | UpdateAdvancedSettingsError:
        return await resolve_update_advanced_settings(info, input)


schema = strawberry.federation.Schema(
    query=Query,
    mutation=Mutation,
    enable_federation_2=True,
    types=[
        CreateAccountSuccess,
        CreateAccountError,
        InstallAddonSuccess,
        InstallAddonError,
        UninstallAddonSuccess,
        UninstallAddonError,
        CreateProfileSuccess,
        CreateProfileError,
        UpdateProfileSuccess,
        UpdateProfileError,
        UpdateProfileSettingsSuccess,
        UpdateProfileSettingsError,
        InstallAddonForAllProfilesSuccess,
        InstallAddonForAllProfilesError,
        UninstallAddonFromAllProfilesSuccess,
        UninstallAddonFromAllProfilesError,
        VerifyProfilePinSuccess,
        VerifyProfilePinError,
        UpdateAdvancedSettingsSuccess,
        UpdateAdvancedSettingsError,
    ],
)


class CustomGraphQLRouter(GraphQLRouter):
    def __init__(self, schema, debug=False, **kwargs):
        super().__init__(schema, **kwargs)
        self.debug = debug  # store it locally for format_graphql_error()

    async def get_context(self, request: Request, response: Response) -> Any:
        return {"request": request}

    async def process_result(
        self, request: Request, result: ExecutionResult
    ) -> GraphQLHTTPResponse:
        data: GraphQLHTTPResponse = {"data": result.data}
        if result.errors:
            data["errors"] = [
                format_graphql_error(err, debug=self.debug) for err in result.errors
            ]
        return data


graphql_app = CustomGraphQLRouter(schema, debug=True)
