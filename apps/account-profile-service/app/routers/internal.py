from dependency_injector.wiring import inject, Provide
from fastapi import APIRouter, Body, Depends
from api_contract.responses import ApiResponse
from app.containers import Container
from core.pydantic.domain.account import Account
from core.pydantic.api.account_api import CreateAccountRequest, SocialLoginRequest
from app.use_cases.account.find_or_create_by_social import FindOrCreateBySocialUseCase
from app.use_cases.account.login import LoginUseCase

router = APIRouter(prefix="/accounts", tags=["Internal"])


@router.post("/validate-credentials", response_model=ApiResponse[Account])
@inject
async def validate_credentials(
    request: CreateAccountRequest = Body(...),
    use_case: LoginUseCase = Depends(Provide[Container.login_use_case]),
):
    """
    Validates a user's email and password.
    Intended to be called by the auth-service.
    Returns the full account object on success.
    The existing LoginUseCase already raises a 401 ApiException on failure,
    which our global exception handler will catch and format correctly.
    """
    account = await use_case.execute(email=request.email, password=request.password)
    return ApiResponse[Account](ok=True, data=account, error=None)


@router.post("/social-login", response_model=ApiResponse[Account])
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
