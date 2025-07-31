import sys
from fastapi import APIRouter, Depends, Body
from dependency_injector.wiring import inject, Provide

from fastapi_factory.app import create_app, Application
from api_contract.responses import ApiResponse
from core.pydantic.api.account_api import CreateAccountRequest
from core.pydantic.domain.account import Account
from security.schemas import TokenResponse
from security.jwt_service import IJwtService
from http_client_factory.client import ApiClient
from domain_exceptions.exceptions import ApiException
from api_contract.errors import ApiErrorCode

from .settings import settings
from .containers import Container
from .routers import refresh as refresh_router
from .routers import social as social_router

app: Application = create_app(settings)
container = Container(settings=settings)
app.container = container
router = APIRouter(tags=["Authentication"])


@router.post("/login", response_model=ApiResponse[TokenResponse])
@inject
async def login_for_access_token(
    form_data: CreateAccountRequest = Body(...),
    api_client: ApiClient = Depends(Provide[Container.api_client]),
    jwt_service: IJwtService = Depends(Provide[Container.jwt_service]),
    settings=Depends(Provide[Container.settings]),
):
    account_service_url = settings.ACCOUNT_PROFILE_SERVICE_URL
    if not account_service_url:
        raise ApiException(
            ApiErrorCode.SERVICE_UNAVAILABLE,
            details={"service": "account-profile-service"},
        )

    validation_url = f"{account_service_url}/internal/v1/accounts/validate-credentials"

    validation_response = await api_client.post(
        url=validation_url, json_payload=form_data.model_dump(), response_model=Account
    )

    # --- THIS IS THE FIX ---
    # The validation_response from our ApiClient is already a perfect ApiResponse.
    # If it failed, we just need to re-raise a standard ApiException that our
    # own exception handler can format correctly for the frontend.
    if not validation_response.ok or not validation_response.data:
        # Check if the error from the downstream service was the specific INVALID_CREDENTIALS error.
        if (
            validation_response.error
            and validation_response.error.type == ApiErrorCode.INVALID_CREDENTIALS.name
        ):
            raise ApiException(ApiErrorCode.INVALID_CREDENTIALS)
        else:
            # For any other error (like the service being down), raise a generic auth error.
            raise ApiException(
                ApiErrorCode.AUTHENTICATION_REQUIRED,
                details=(
                    validation_response.error.details
                    if validation_response.error
                    else None
                ),
                override_message="Upstream validation failed during login.",
            )

    # If we get here, the login was successful.
    account = validation_response.data
    token_payload = {"sub": account.id, "email": account.email}
    access_token = jwt_service.create_access_token(data=token_payload)
    refresh_token = jwt_service.create_refresh_token(data=token_payload)

    token_response = TokenResponse(
        accessToken=access_token, refreshToken=refresh_token, tokenType="bearer"
    )

    return ApiResponse[TokenResponse](ok=True, data=token_response, error=None)


container.wire(
    modules=[sys.modules[__name__], "app.routers.refresh", "app.routers.social"]
)

app.include_router(router)
app.include_router(refresh_router.router)
app.include_router(social_router.router)
