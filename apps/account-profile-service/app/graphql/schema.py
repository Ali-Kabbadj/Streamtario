import strawberry
from typing import List
from strawberry.fastapi import GraphQLRouter
from .types import ProfileType
from .resolvers import resolve_profile


@strawberry.input
class ProfileRepresentation:
    id: strawberry.ID


@strawberry.type
class Query:
    @strawberry.field
    async def profile(self, id: strawberry.ID) -> ProfileType | None:
        return await resolve_profile(id=id)

    @strawberry.field(name="_entities")
    async def resolve_entities(
        self, representations: List[ProfileRepresentation]
    ) -> List[ProfileType]:
        results: List[ProfileType] = []
        for rep in representations:
            profile = await resolve_profile(id=rep.id)
            if profile:
                results.append(profile)
        return results


schema = strawberry.federation.Schema(
    query=Query,
    enable_federation_2=True,
)

graphql_app = GraphQLRouter(schema)
