from typing import List
from dependency_injector.wiring import inject, Provide
from fastapi import APIRouter, Body, Depends, Query
from api_contract.responses import ApiResponse
from app.containers import Container
from core.pydantic.domain.account import Account
from core.pydantic.api.account_api import CreateAccountRequest, SocialLoginRequest
from core.pydantic.api.internals import ManifestUrlsResponse
from app.use_cases.account.find_or_create_by_social import FindOrCreateBySocialUseCase
from app.use_cases.account.login import LoginUseCase
from app.use_cases.profile.get_manifest_urls_for_profile import (
    GetManifestUrlsForProfileUseCase,
)
from app.use_cases.profile.get_playback_history import GetPlaybackHistoryUseCase
from app.use_cases.profile.get_playback_history import GetPlaybackHistoryUseCase
from security.schemas import TokenPayload
from app.security.dependencies import get_current_user_payload
from core.pydantic.api.internals import ManifestUrlsResponse, PlaybackHistoryResponse

router = APIRouter(tags=["Internal"])


@router.post("/accounts/validate-credentials", response_model=ApiResponse[Account])
@inject
async def validate_credentials(
    request: CreateAccountRequest = Body(...),
    use_case: LoginUseCase = Depends(Provide[Container.login_use_case]),
):
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
async def get_manifest_urls(
    profile_id: str,
    use_case: GetManifestUrlsForProfileUseCase = Depends(
        Provide[Container.get_manifest_urls_for_profile_use_case]
    ),
):
    urls = await use_case.execute(profile_id)
    response_data = ManifestUrlsResponse(manifest_urls=urls)
    return ApiResponse[ManifestUrlsResponse](ok=True, data=response_data, error=None)


@router.get(
    "/profiles/{profile_id}/playback-history",
    response_model=ApiResponse[PlaybackHistoryResponse],
)
@inject
async def get_playback_history(
    profile_id: str,
    content_ids: List[str] = Query(...),
    use_case: GetPlaybackHistoryUseCase = Depends(
        Provide[Container.get_playback_history_use_case]
    ),
    token_payload: TokenPayload = Depends(get_current_user_payload),
):
    history = await use_case.execute(
        requesting_account_id=token_payload.sub,
        profile_id=profile_id,
        content_ids=content_ids,
    )
    # Wrap the list in the new response model
    response_data = PlaybackHistoryResponse(items=history)
    return ApiResponse[PlaybackHistoryResponse](ok=True, data=response_data, error=None)
