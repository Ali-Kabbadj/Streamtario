from dependency_injector.wiring import inject, Provide
from fastapi import APIRouter, Body, Depends
from api_contract.responses import ApiResponse
from app.containers import Container
from core.pydantic.domain.account import Account
from core.pydantic.api.account_api import CreateAccountRequest, SocialLoginRequest
from app.use_cases.account.find_or_create_by_social import FindOrCreateBySocialUseCase
from app.use_cases.account.login import LoginUseCase
from app.use_cases.profile.get_profile import GetProfileUseCase
from domain_exceptions.exceptions import ApiException
from core.pydantic.api.internals import ManifestUrlsResponse

router = APIRouter(tags=["Internal"])


@router.post("/accounts/validate-credentials", response_model=ApiResponse[Account])
@inject
async def validate_credentials(
    request: CreateAccountRequest = Body(...),
    use_case: LoginUseCase = Depends(Provide[Container.login_use_case]),
):
    """
    Validates a user's email and password.
    Intended to be called by the auth-service.
    """
    account = await use_case.execute(email=request.email, password=request.password)
    return ApiResponse[Account](ok=True, data=account, error=None)


@router.post("/accounts/social-login", response_model=ApiResponse[Account])
@inject
async def find_or_create_social_account(
    request: SocialLoginRequest = Body(...),
    use_case: FindOrCreateBySocialUseCase = Depends(
        Provide[Container.find_or_create_by_social_use_case]
    ),
):
    """
    Finds or creates an account based on a validated social provider ID.
    Intended to be called by the auth-service.
    """
    account = await use_case.execute(
        provider=request.provider,
        social_id=request.social_id,
        email=request.email,
    )
    return ApiResponse[Account](ok=True, data=account, error=None)


@router.get(
    "/profiles/{profile_id}/manifest-urls",
    response_model=ApiResponse[ManifestUrlsResponse],
)
@inject
async def get_manifest_urls_for_profile(
    profile_id: str,
    use_case: GetProfileUseCase = Depends(Provide[Container.get_profile_use_case]),
):
    """
    Internal endpoint for fetching just the manifest URLs for a given profile.
    Called by the addon-controller-service.
    """
    try:
        profile = await use_case.execute(profile_id, requesting_account_id=None)
        response_data = ManifestUrlsResponse(manifest_urls=profile.manifest_urls)
        return ApiResponse[ManifestUrlsResponse](
            ok=True, data=response_data, error=None
        )
    except ApiException as e:
        raise e
