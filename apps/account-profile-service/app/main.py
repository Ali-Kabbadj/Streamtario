# /apps/account-profile-service/app/main.py

import sys
from .settings import settings
from .containers import Container
from app.routers import accounts, profiles
from app.routers import internal as internal_router  # <-- NEW IMPORT
from fastapi_factory.app import create_app, Application
from .graphql.schema import graphql_app

app: Application = create_app(settings)
container = Container(settings=settings)
app.container = container

container.wire(
    modules=[
        sys.modules[__name__],
        "app.routers.accounts",
        "app.routers.profiles",
        "app.routers.internal",
        "app.graphql.resolvers",
        "app.security.dependencies",
    ]
)

# Public API Routers
app.include_router(accounts.router, prefix="/api/v1")
app.include_router(profiles.router, prefix="/api/v1")
app.include_router(graphql_app, prefix="/graphql")

# Internal Service-to-Service Router
app.include_router(internal_router.router, prefix="/internal/v1")
