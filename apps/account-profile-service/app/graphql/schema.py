import strawberry
from typing import List
from strawberry.fastapi import GraphQLRouter
from .types import ProfileType
from .resolvers import resolve_profile


# This input type is used by the gateway for the _entities query.
@strawberry.input
class ProfileRepresentation:
    id: strawberry.ID


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
    ) -> List[ProfileType]:
        results: List[ProfileType] = []
        for rep in representations:
            # Here you could add `isinstance` checks if you own multiple entities
            profile = await resolve_profile(id=rep.id)
            if profile:
                results.append(profile)
        return results


# We initialize the schema with federation enabled.
schema = strawberry.federation.Schema(
    query=Query,
    enable_federation_2=True,
)

graphql_app = GraphQLRouter(schema)
