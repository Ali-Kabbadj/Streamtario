import strawberry
from strawberry.fastapi import GraphQLRouter
from .types import ProfileExtension, AddonSearchResultType, AddonManifestType
from typing import AsyncGenerator, Optional
from strawberry.types import Info
from core.utils.logging import log_info
from typing import Dict, Any


@strawberry.type
class Query:
    @strawberry.field
    async def manifest_by_url(self, url: str) -> Optional[AddonManifestType]:
        from .resolvers import resolve_manifest_by_url

        return await resolve_manifest_by_url(url=url)


@strawberry.type
class Subscription:
    @strawberry.subscription
    async def search(
        self,
        info: Info,
        profileId: str,
        query: str,
    ) -> AsyncGenerator[AddonSearchResultType, None]:

        container = info.context["container"]
        use_case = container.search_use_case()

        log_info(
            f"GraphQL: Starting root 'search' subscription for profile {profileId}",
            context="graphql",
            data={"query": query},
        )

        async for result in use_case.execute(profile_id=profileId, search_query=query):
            log_info(
                f"Received result from use case: {result.model_dump_json()}",
                context="graphql",
            )
            if result.error:
                yield AddonSearchResultType(
                    addon_name=result.addon_name,
                    results_by_type={},
                    error=result.error.message,
                )
                continue

            serializable_results = {
                type_name: [item.model_dump() for item in items]
                for type_name, items in result.results_by_type.items()
            }
            yield AddonSearchResultType(
                addon_name=result.addon_name,
                results_by_type=serializable_results,
                error=None,
            )


schema = strawberry.federation.Schema(
    query=Query,
    subscription=Subscription,
    enable_federation_2=True,
    types=[ProfileExtension],
)


async def get_context() -> Dict[str, Any]:
    from app.main import app as fastapi_app

    return {"container": fastapi_app.container}


graphql_app = GraphQLRouter(schema, context_getter=get_context)
