import sys
import asyncio
from typing import Dict, Any
from .settings import settings
from .containers import Container
from .api.v1 import routes as v1_routes
from .api.internal import routes as internal_routes
from fastapi_factory.app import create_app, Application
from strawberry.fastapi import GraphQLRouter
from .graphql.schema import schema


app: Application = create_app(settings)

container = Container(settings=settings)
app.container = container


# This context getter now lives in main.py and has direct access to the container
async def get_context() -> Dict[str, Any]:
    return {"container": container}


graphql_app = GraphQLRouter(schema, context_getter=get_context)


container.wire(
    modules=[
        sys.modules[__name__],
        ".api.v1.routes",
        ".api.internal.routes",
        ".graphql.resolvers",
    ]
)


@app.on_event("startup")
async def startup_event():
    from core.utils.logging import setup_logging, log_init

    setup_logging(app_name=settings.APP_NAME)
    log_init(f"Service '{settings.APP_NAME}' starting up in '{settings.APP_ENV}' mode")

    subscriber = container.redis_event_subscriber()
    asyncio.create_task(subscriber.listen())


app.include_router(v1_routes.router, prefix="/api/v1", tags=["Addons (Legacy REST)"])
app.include_router(internal_routes.router, prefix="/internal/v1", tags=["Internal"])
app.include_router(graphql_app, prefix="/graphql", tags=["Internal GraphQL"])
