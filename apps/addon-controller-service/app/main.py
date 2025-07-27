import sys
import asyncio
from .settings import settings
from .containers import Container
from .api.v1 import routes as v1_routes
from fastapi_factory.app import create_app, Application
from .graphql.schema import graphql_app

app: Application = create_app(settings)

container = Container(settings=settings)
app.container = container
container.wire(modules=[sys.modules[__name__], ".api.v1.routes", ".graphql.resolvers"])


@app.on_event("startup")
async def startup_event():
    from core.utils.logging import setup_logging, log_init

    setup_logging(app_name=settings.APP_NAME)
    log_init(f"Service '{settings.APP_NAME}' starting up in '{settings.APP_ENV}' mode")

    subscriber = container.redis_event_subscriber()
    asyncio.create_task(subscriber.listen())


app.include_router(v1_routes.router, prefix="/api/v1", tags=["Addons (Legacy REST)"])
app.include_router(graphql_app, prefix="/graphql", tags=["Internal GraphQL"])
