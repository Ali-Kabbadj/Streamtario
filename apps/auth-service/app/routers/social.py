import logging
from fastapi import APIRouter, Depends, Body
from dependency_injector.wiring import inject, Provide
from pydantic import BaseModel
from app.settings import AuthSettings
from google.oauth2 import id_token
from google.auth.transport import requests
import google_auth_oauthlib.flow
from google.auth.exceptions import GoogleAuthError
import json
import os

from app.containers import Container
from api_contract.responses import ApiResponse
from security.schemas import TokenResponse
from security.jwt_service import IJwtService
from http_client_factory.client import ApiClient
from domain_exceptions.exceptions import ApiException
from api_contract.errors import ApiErrorCode
from core.pydantic.domain.account import Account
from typing import Optional

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Authentication"])


class GoogleLoginRequest(BaseModel):
    code: str
    redirect_uri: Optional[str] = None


@router.post("/google/login", response_model=ApiResponse[TokenResponse])
@inject
async def google_login(
    request: GoogleLoginRequest = Body(...),
    api_client: ApiClient = Depends(Provide[Container.api_client]),
    jwt_service: IJwtService = Depends(Provide[Container.jwt_service]),
    settings: AuthSettings = Depends(Provide[Container.settings]),
):
    """A single, robust endpoint to handle both web and native Google login."""
    try:
        if not os.path.exists(settings.GOOGLE_CLIENT_SECRETS_FILE):
             raise FileNotFoundError(f"Secrets file not found at {settings.GOOGLE_CLIENT_SECRETS_FILE}")

        with open(settings.GOOGLE_CLIENT_SECRETS_FILE, 'r') as f:
            client_config = json.load(f)

        flow = google_auth_oauthlib.flow.Flow.from_client_config(
            client_config,
            scopes=None,
            redirect_uri = request.redirect_uri or settings.FRONTEND_URL
        )

        flow.fetch_token(code=request.code)

        credentials = flow.credentials
        id_info = id_token.verify_oauth2_token(
            credentials.id_token, requests.Request(), settings.GOOGLE_CLIENT_ID # type: ignore
        )

        google_user_id = id_info["sub"]
        email = id_info["email"]

    except Exception as e:
        logger.error(f"Google login failed unexpectedly: {e}", exc_info=True)
        raise ApiException(
            ApiErrorCode.GOOGLE_UNKOWN_ERROR,
            details={"reason": "An unexpected error occurred during Google login.", "error": str(e)},
        )

    account_service_url = settings.ACCOUNT_PROFILE_SERVICE_URL
    internal_url = f"{account_service_url}/internal/v1/accounts/social-login"
    social_payload = {"provider": "google", "social_id": google_user_id, "email": email}
    account_response = await api_client.post(url=internal_url, json_payload=social_payload, response_model=Account)

    if not account_response.ok or not account_response.data:
        raise ApiException(ApiErrorCode.AUTHENTICATION_REQUIRED, details="Failed to login or create account via account-service.")

    account = account_response.data
    token_payload = {"sub": account.id, "email": account.email}
    access_token = jwt_service.create_access_token(data=token_payload)
    refresh_token = jwt_service.create_refresh_token(data=token_payload)
    token_response = TokenResponse(accessToken=access_token, refreshToken=refresh_token, tokenType="bearer")

    return ApiResponse[TokenResponse](ok=True, data=token_response, error=None)