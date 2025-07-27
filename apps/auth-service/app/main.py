# /apps/auth-service/app/main.py
import sys
from fastapi import APIRouter, Depends, Body
from dependency_injector.wiring import inject, Provide

from fastapi_factory.app import create_app, Application
from api_contract.responses import ApiResponse
from core.pydantic.api.account_api import CreateAccountRequest
from core.pydantic.domain.account import Account
from security.schemas import TokenResponse, TokenPayload
from security.jwt_service import IJwtService
from http_client_factory.client import ApiClient
from domain_exceptions.exceptions import ApiException

from .settings import settings
from .containers import Container
from .routers import refresh as refresh_router
from .routers import social as social_router

app: Application = create_app(settings)
container = Container(settings=settings)
app.container = container

# --- Define Router for LOGIN ---
# No prefix. The path is exactly what the gateway sends.
router = APIRouter(tags=["Authentication"])


@router.post("/login", response_model=ApiResponse[TokenResponse])
@inject
async def login_for_access_token(
    form_data: CreateAccountRequest = Body(...),
    api_client: ApiClient = Depends(Provide[Container.api_client]),
    jwt_service: IJwtService = Depends(Provide[Container.jwt_service]),
    settings=Depends(Provide[Container.settings]),
):
    # This function's body is correct and remains unchanged.
    account_service_url = settings.ACCOUNT_PROFILE_SERVICE_URL
    if not account_service_url:
        raise ApiException("Authentication backend is not configured.", status_code=503)
    validation_url = f"{account_service_url}/internal/v1/accounts/validate-credentials"
    validation_response = await api_client.post(
        url=validation_url, json_payload=form_data.model_dump(), response_model=Account
    )
    if not validation_response.ok or not validation_response.data:
        raise ApiException(
            message=(
                validation_response.error.dev_message
                if validation_response.error
                else "Invalid credentials"
            ),
            ui_message=(
                validation_response.error.ui_message
                if validation_response.error
                else "Invalid credentials"
            ),
            status_code=401,
        )
    account = validation_response.data
    token_payload = TokenPayload(sub=account.id, email=account.email)
    access_token = jwt_service.create_access_token(data=token_payload.model_dump())
    refresh_token = jwt_service.create_refresh_token(data=token_payload.model_dump())
    token_response = TokenResponse(
        accessToken=access_token, refreshToken=refresh_token, tokenType="bearer"
    )
    return ApiResponse[TokenResponse](ok=True, data=token_response, error=None)


# --- Wire up everything ---
container.wire(
    modules=[sys.modules[__name__], "app.routers.refresh", "app.routers.social"]
)

# --- Include all routers with NO prefixes ---
app.include_router(router)
app.include_router(refresh_router.router)
app.include_router(social_router.router)
