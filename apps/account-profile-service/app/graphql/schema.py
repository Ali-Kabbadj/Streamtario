# /apps/account-profile-service/app/graphql/schema.py

import strawberry
from typing import List
from strawberry.fastapi import GraphQLRouter
from .types import (
    ProfileType,
    CreateAccountInput,
    CreateAccountSuccess,
    CreateAccountError,
    InstallAddonInput,
    InstallAddonSuccess,
    InstallAddonError,
    UninstallAddonInput,
    UninstallAddonSuccess,
    UninstallAddonError,
)
from .resolvers import (
    resolve_profile,
    resolve_create_account,
    resolve_install_addon,
    resolve_uninstall_addon,
)


# This input type is used by the gateway for the _entities query.
@strawberry.input
class ProfileRepresentation:
    id: strawberry.ID
    # CORRECTED: Ignore the Pylance error, as this field is required by the federation spec.
    __typename: str  # type: ignore


@strawberry.type
class Query:
    # A standard query field for fetching a profile. Good for testing.
    @strawberry.field
    async def profile(self, id: strawberry.ID) -> ProfileType | None:
        return await resolve_profile(id=id)

    # This is the required field for federation. The gateway calls this
    # to resolve entities that this service owns.
    @strawberry.field(name="_entities")
    async def resolve_entities(
        self, representations: List[ProfileRepresentation]
    ) -> List[ProfileType | None]:  # Return list of optionals
        results: List[ProfileType | None] = []
        for rep in representations:
            # Here you could add `isinstance` checks if you own multiple entities
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
    async def install_addon(
        self, input: InstallAddonInput
    ) -> InstallAddonSuccess | InstallAddonError:
        return await resolve_install_addon(input)

    @strawberry.mutation
    async def uninstall_addon(
        self, input: UninstallAddonInput
    ) -> UninstallAddonSuccess | UninstallAddonError:
        return await resolve_uninstall_addon(input)


# We initialize the schema with federation enabled.
# All types used in unions must be explicitly passed in the 'types' list
# if they are not discoverable elsewhere in the schema.
schema = strawberry.federation.Schema(
    query=Query,
    mutation=Mutation,  # Add the mutation type to the schema
    enable_federation_2=True,
    types=[
        CreateAccountSuccess,
        CreateAccountError,
        InstallAddonSuccess,
        InstallAddonError,
        UninstallAddonSuccess,
        UninstallAddonError,
    ],
)

graphql_app = GraphQLRouter(schema)
