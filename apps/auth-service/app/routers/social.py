import logging
from fastapi import APIRouter, Depends, Body
from dependency_injector.wiring import inject, Provide
from pydantic import BaseModel
from app.settings import AuthSettings
from google.oauth2 import id_token
from google.auth.transport import requests
import google_auth_oauthlib.flow
from google.auth.exceptions import GoogleAuthError

from app.containers import Container
from api_contract.responses import ApiResponse
from security.schemas import TokenResponse
from security.jwt_service import IJwtService
from http_client_factory.client import ApiClient

from domain_exceptions.exceptions import ApiException
from api_contract.errors import ApiErrorCode
from core.pydantic.domain.account import Account

# Get a logger for this module
logger = logging.getLogger(__name__)

router = APIRouter(tags=["Authentication"])


class GoogleLoginRequest(BaseModel):
    code: str


@router.post("/google/login", response_model=ApiResponse[TokenResponse])
@inject
async def google_login(
    request: GoogleLoginRequest = Body(...),
    api_client: ApiClient = Depends(Provide[Container.api_client]),
    jwt_service: IJwtService = Depends(Provide[Container.jwt_service]),
    settings: AuthSettings = Depends(Provide[Container.settings]),
):
    logger.info("--- Starting Google Login Process ---")
    logger.info(f"Using Client ID: {settings.GOOGLE_CLIENT_ID}")
    logger.info(f"Using Client Secrets File: {settings.GOOGLE_CLIENT_SECRETS_FILE}")

    try:
        logger.info("Step 1: Initializing Google Flow from client secrets file.")
        flow = google_auth_oauthlib.flow.Flow.from_client_secrets_file(
            settings.GOOGLE_CLIENT_SECRETS_FILE,
            scopes=None,  # Scopes are set in the Google Console
        )

        # IMPORTANT: This must match a URI in your "Authorized redirect URIs" list in the Google Console.
        redirect_uri = "https://localhost:3000"
        flow.redirect_uri = redirect_uri
        logger.info(f"Step 2: Set redirect_uri for the flow to: {redirect_uri}")

        logger.info(
            "Step 3: Attempting to fetch token from Google with the provided authorization code."
        )
        flow.fetch_token(code=request.code)
        logger.info("Step 3a: Successfully fetched token.")

        credentials = flow.credentials
        if not credentials or not credentials.id_token:
            logger.error(
                "Critical Failure: Flow completed but credentials or id_token is missing."
            )
            raise ApiException(
                ApiErrorCode.GOOGLE_LOGIN_FAILED,
                details={
                    "reason": "Credentials or id_token was not returned from Google."
                },
            )

        logger.info("Step 4: Verifying the ID token received from Google.")
        id_info = id_token.verify_oauth2_token(
            credentials.id_token,
            requests.Request(),
            settings.GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=10,
        )
        logger.info(
            f"Step 4a: Token verified successfully. User email: {id_info.get('email')}"
        )

        google_user_id = id_info["sub"]
        email = id_info["email"]

    except FileNotFoundError:
        logger.exception("FATAL: The Google client secrets JSON file was not found!")
        raise ApiException(
            ApiErrorCode.GOOGLE_LOGIN_FAILED,
            details={
                "reason": f"Server configuration error: {settings.GOOGLE_CLIENT_SECRETS_FILE} not found."
            },
        )
    except (GoogleAuthError, ValueError) as e:
        # This is the most likely place for the error to occur.
        # We log the full exception to see the exact reason from Google's library.
        logger.exception(
            "CRITICAL: An error occurred during the Google authentication flow."
        )
        raise ApiException(
            ApiErrorCode.GOOGLE_LOGIN_FAILED,
            details={
                "reason": "Invalid Google auth code or configuration mismatch.",
                "error": str(e),
            },
        )
    except Exception as e:
        logger.exception(
            "An unexpected error occurred during the Google login process."
        )
        raise ApiException(
            ApiErrorCode.UNKNOWN,
            details={"reason": "An unexpected error occurred.", "error": str(e)},
        )

    logger.info(
        "Step 5: Google authentication successful. Proceeding to internal account lookup."
    )
    account_service_url = settings.ACCOUNT_PROFILE_SERVICE_URL
    if not account_service_url:
        logger.error("FATAL: ACCOUNT_PROFILE_SERVICE_URL is not configured.")
        raise ApiException(
            ApiErrorCode.SERVICE_UNAVAILABLE,
            details={"service": "account-profile-service"},
        )

    internal_url = f"{account_service_url}/internal/v1/accounts/social-login"
    social_payload = {"provider": "google", "social_id": google_user_id, "email": email}
    logger.info(f"Step 6: Calling internal account service at {internal_url}")

    account_response = await api_client.post(
        url=internal_url, json_payload=social_payload, response_model=Account
    )

    if not account_response.ok or not account_response.data:
        logger.error(
            f"Internal account service failed. Response: {account_response.error}"
        )
        error_to_raise = ApiErrorCode.AUTHENTICATION_REQUIRED
        if (
            account_response.error
            and account_response.error.type
            == ApiErrorCode.ACCOUNT_EMAIL_IN_USE_BY_SOCIAL.name
        ):
            error_to_raise = ApiErrorCode.ACCOUNT_EMAIL_IN_USE_BY_SOCIAL

        raise ApiException(
            error_to_raise,
            details=account_response.error.details if account_response.error else None,
        )

    logger.info("Step 7: Internal account lookup successful. Generating JWT tokens.")
    account = account_response.data
    token_payload = {"sub": account.id, "email": account.email}
    access_token = jwt_service.create_access_token(data=token_payload)
    refresh_token = jwt_service.create_refresh_token(data=token_payload)

    token_response = TokenResponse(
        accessToken=access_token, refreshToken=refresh_token, tokenType="bearer"
    )

    logger.info("--- Google Login Process Completed Successfully ---")
    return ApiResponse[TokenResponse](ok=True, data=token_response, error=None)
