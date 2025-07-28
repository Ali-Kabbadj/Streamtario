from fastapi import APIRouter, Depends, Body
from dependency_injector.wiring import inject, Provide
from pydantic import BaseModel
from app.settings import AuthSettings
from google.oauth2 import id_token  # type: ignore
from google.auth.transport import requests  # type: ignore

from app.containers import Container
from api_contract.responses import ApiResponse
from security.schemas import TokenResponse
from security.jwt_service import IJwtService
from http_client_factory.client import ApiClient

from domain_exceptions.exceptions import ApiException
from api_contract.errors import ApiErrorCode
from core.pydantic.domain.account import Account


router = APIRouter(tags=["Authentication"])


class GoogleLoginRequest(BaseModel):
    token: str


@router.post("/google/login", response_model=ApiResponse[TokenResponse])
@inject
async def google_login(
    request: GoogleLoginRequest = Body(...),
    api_client: ApiClient = Depends(Provide[Container.api_client]),
    jwt_service: IJwtService = Depends(Provide[Container.jwt_service]),
    settings: AuthSettings = Depends(Provide[Container.settings]),
):
    """
    Authenticates a user with a Google ID token and issues local JWTs.
    """
    try:
        # --- THIS IS THE FIX ---
        # We add the `clock_skew_in_seconds` parameter to the verification call.
        # This tells the library to tolerate a small difference (e.g., up to 10 seconds)
        # between the token's timestamp and the server's clock. This is a robust
        # way to handle minor clock drift in distributed systems.
        id_info = id_token.verify_oauth2_token(
            request.token,
            requests.Request(),
            settings.GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=10,
        )

        google_user_id = id_info["sub"]
        email = id_info["email"]

    except ValueError as e:
        raise ApiException(
            ApiErrorCode.GOOGLE_LOGIN_FAILED,
            details={"reason": "Invalid Google token", "error": str(e)},
        )

    account_service_url = settings.ACCOUNT_PROFILE_SERVICE_URL
    if not account_service_url:
        raise ApiException(
            ApiErrorCode.SERVICE_UNAVAILABLE,
            details={"service": "account-profile-service"},
        )

    internal_url = f"{account_service_url}/internal/v1/accounts/social-login"
    social_payload = {"provider": "google", "social_id": google_user_id, "email": email}

    account_response = await api_client.post(
        url=internal_url, json_payload=social_payload, response_model=Account
    )

    if not account_response.ok or not account_response.data:
        error_to_raise = ApiErrorCode.AUTHENTICATION_REQUIRED
        if (
            account_response.error
            and account_response.error.type == ApiErrorCode.ACCOUNT_EMAIL_EXISTS.name
        ):
            error_to_raise = ApiErrorCode.ACCOUNT_EMAIL_EXISTS

        raise ApiException(
            error_to_raise,
            details=account_response.error.details if account_response.error else None,
        )

    account = account_response.data
    token_payload = {"sub": account.id, "email": account.email}
    access_token = jwt_service.create_access_token(data=token_payload)
    refresh_token = jwt_service.create_refresh_token(data=token_payload)

    token_response = TokenResponse(
        accessToken=access_token, refreshToken=refresh_token, tokenType="bearer"
    )

    return ApiResponse[TokenResponse](ok=True, data=token_response, error=None)
