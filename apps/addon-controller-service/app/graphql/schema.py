import strawberry
from strawberry.fastapi import GraphQLRouter
from .types import ProfileExtension


@strawberry.type
class Query:
    _service_name: str = "content"


schema = strawberry.federation.Schema(
    query=Query,
    enable_federation_2=True,
    types=[ProfileExtension],
)

graphql_app = GraphQLRouter(schema)
