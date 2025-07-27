# /apps/auth-service/app/routers/social.py

from fastapi import APIRouter, Depends, Body
from dependency_injector.wiring import inject, Provide
from pydantic import BaseModel
from google.oauth2 import id_token  # type: ignore
from google.auth.transport import requests  # type: ignore

from app.containers import Container
from api_contract.responses import ApiResponse
from security.schemas import TokenResponse, TokenPayload
from security.jwt_service import IJwtService
from http_client_factory.client import ApiClient
from domain_exceptions.exceptions import ApiException
from core.pydantic.domain.account import Account

router = APIRouter(tags=["Authentication"])


class GoogleLoginRequest(BaseModel):
    token: str  # This is the id_token from Google


@router.post("/google/login", response_model=ApiResponse[TokenResponse])
@inject
async def google_login(
    request: GoogleLoginRequest = Body(...),
    api_client: ApiClient = Depends(Provide[Container.api_client]),
    jwt_service: IJwtService = Depends(Provide[Container.jwt_service]),
    settings=Depends(Provide[Container.settings]),
):
    """
    Authenticates a user with a Google ID token and issues local JWTs.
    """
    try:
        # 1. Verify the Google ID token
        id_info = id_token.verify_oauth2_token(request.token, requests.Request())
        # In a real app, you'd also verify the 'aud' (audience) claim matches your Google Client ID.

        google_user_id = id_info["sub"]
        email = id_info["email"]

    except ValueError as e:
        raise ApiException(
            status_code=401,
            message=f"Invalid Google token: {e}",
            ui_message="The Google authentication token is invalid.",
        )

    # 2. Call account-profile-service to find or create the account
    account_service_url = settings.ACCOUNT_PROFILE_SERVICE
    if not account_service_url:
        raise ApiException("Authentication backend is not configured.", status_code=503)

    internal_url = f"{account_service_url}/internal/v1/accounts/social-login"
    social_payload = {"provider": "google", "social_id": google_user_id, "email": email}

    account_response = await api_client.post(
        url=internal_url, json_payload=social_payload, response_model=Account
    )

    if not account_response.ok or not account_response.data:
        raise ApiException(
            message=(
                account_response.error.dev_message
                if account_response.error
                else "Could not process social login."
            ),
            ui_message=(
                account_response.error.ui_message
                if account_response.error
                else "An error occurred during social login."
            ),
            status_code=409,  # Conflict is a likely error here
        )

    account = account_response.data

    # 3. Issue our own JWTs
    token_payload = TokenPayload(sub=account.id, email=account.email)
    access_token = jwt_service.create_access_token(data=token_payload.model_dump())
    refresh_token = jwt_service.create_refresh_token(data=token_payload.model_dump())

    token_response = TokenResponse(
        accessToken=access_token, refreshToken=refresh_token, tokenType="bearer"
    )

    return ApiResponse[TokenResponse](ok=True, data=token_response, error=None)
