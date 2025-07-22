import sys

from app.routers import accounts, profiles
from .settings import settings
from .containers import Container
from fastapi_factory.app_factory import create_app, Application

app: Application = create_app(settings)
container = Container(settings=settings)
app.container = container

# --- Wire the container to the new router locations ---
container.wire(
    modules=[sys.modules[__name__], ".routers.accounts", ".routers.profiles"]
)

# --- Include the new routers in the app ---
app.include_router(accounts.router, prefix="/api/v1")
app.include_router(profiles.router, prefix="/api/v1")
