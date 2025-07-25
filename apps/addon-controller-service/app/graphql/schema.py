import strawberry
from strawberry.fastapi import GraphQLRouter
from .types import ProfileExtension


@strawberry.type
class Query:
    # A root query type is required by the spec, even if it's empty.
    # The main functionality is exposed via the ProfileExtension.
    _service_name: str = "content"


schema = strawberry.federation.Schema(
    query=Query,
    enable_federation_2=True,
    types=[ProfileExtension],
)

graphql_app = GraphQLRouter(schema)
