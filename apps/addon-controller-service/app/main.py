import sys
from .settings import settings
from .containers import Container
from .api.v1 import routes as v1_routes
from fastapi_factory.app import create_app, Application


from .graphql.schema import graphql_app

app: Application = create_app(settings)

container = Container()
app.container = container
container.wire(modules=[sys.modules[__name__], ".api.v1.routes", ".graphql.resolvers"])
app.include_router(v1_routes.router, prefix="/api/v1", tags=["Addons (Legacy REST)"])
app.include_router(graphql_app, prefix="/graphql", tags=["Internal GraphQL"])
