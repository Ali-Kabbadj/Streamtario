import sys
from .settings import settings
from .containers import Container
from app.routers import internal as internal_router
from fastapi_factory.app import create_app, Application
from .graphql.schema import graphql_app

app: Application = create_app(settings)
container = Container(settings=settings)
app.container = container

container.wire(
    modules=[
        sys.modules[__name__],
        "app.routers.internal",
        "app.graphql.resolvers",
        "app.security.dependencies",
    ]
)

app.include_router(graphql_app, prefix="/graphql")
app.include_router(internal_router.router, prefix="/internal/v1")
