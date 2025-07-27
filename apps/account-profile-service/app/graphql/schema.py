# /apps/account-profile-service/app/graphql/schema.py

import strawberry
from typing import List
from strawberry.fastapi import GraphQLRouter
from strawberry.types import Info
from fastapi import Request  # <-- THE CORRECT IMPORT

from .types import (
    AccountType,
    InstallAddonForAllProfilesError,
    InstallAddonForAllProfilesInput,
    InstallAddonForAllProfilesSuccess,
    ProfileType,
    CreateAccountInput,
    CreateAccountSuccess,
    CreateAccountError,
    InstallAddonInput,
    InstallAddonSuccess,
    InstallAddonError,
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
from .resolvers import (
    resolve_install_addon_for_all_profiles,
    resolve_account,
    resolve_profile,
    resolve_create_account,
    resolve_install_addon,
    resolve_uninstall_addon,
    resolve_create_profile,
    resolve_uninstall_addon_from_all_profiles,
    resolve_update_profile,
)


@strawberry.input
class ProfileRepresentation:
    id: strawberry.ID
    __typename: str  # type: ignore


@strawberry.type
class Query:
    @strawberry.field
    async def profile(self, id: strawberry.ID) -> ProfileType | None:
        return await resolve_profile(id=id)

    @strawberry.field
    async def account(self, info: Info) -> AccountType | None:
        """Fetches the complete account details for the currently authenticated user."""
        return await resolve_account(info)

    @strawberry.field(name="_entities")
    async def resolve_entities(
        self, representations: List[ProfileRepresentation]
    ) -> List[ProfileType | None]:
        results: List[ProfileType | None] = []
        for rep in representations:
            if rep.__typename == "Profile":
                profile = await resolve_profile(id=rep.id)
                results.append(profile)
        return results


@strawberry.type
class Mutation:
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


async def get_context(request: Request) -> dict:
    """
    This function creates the `info.context` dictionary.
    The `request` object is now correctly imported from `fastapi`.
    """
    return {"request": request}


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
        UpdateProfileSuccess,
        UpdateProfileError,
        InstallAddonForAllProfilesSuccess,
        InstallAddonForAllProfilesError,
        UninstallAddonFromAllProfilesSuccess,
        UninstallAddonFromAllProfilesError,
    ],
)

graphql_app = GraphQLRouter(schema, context_getter=get_context)
