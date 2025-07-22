import sys
from .settings import settings
from .containers import Container
from .api.v1 import routes as v1_routes
from fastapi_factory.app_factory import create_app, Application

app: Application = create_app(settings)

container = Container()
app.container = container
container.wire(modules=[sys.modules[__name__], ".api.v1.routes"])

app.include_router(v1_routes.router, prefix="/api/v1", tags=["Addons"])
