import sys
from .settings import settings
from .containers import Container
from app.routers import accounts, profiles
from fastapi_factory.app import create_app, Application
from .graphql.schema import graphql_app

app: Application = create_app(settings)
container = Container(settings=settings)
app.container = container

container.wire(
    modules=[
        sys.modules[__name__],
        ".routers.accounts",
        ".routers.profiles",
        ".graphql.resolvers",
    ]
)

app.include_router(accounts.router, prefix="/api/v1")
app.include_router(profiles.router, prefix="/api/v1")
app.include_router(graphql_app, prefix="/graphql")
