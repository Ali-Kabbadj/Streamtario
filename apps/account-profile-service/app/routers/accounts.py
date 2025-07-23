from dependency_injector.wiring import inject, Provide
from fastapi import APIRouter, Body, Depends

# --- UPDATED IMPORTS ---
from api_contract.responses import ApiResponse
from app.containers import Container
from core.pydantic.domain.account import Account
from core.pydantic.api.account_api import CreateAccountRequest
from core.pydantic.api.profile_api import InstallAddonRequest
from app.use_cases.account.create_account import CreateAccountUseCase
from app.use_cases.account.get_account import GetAccountUseCase
from app.use_cases.profile.install_addon_for_all_profiles import (
    InstallAddonForAllProfilesUseCase,
)
from app.use_cases.profile.uninstall_addon_from_all_profiles import (
    UninstallAddonFromAllProfilesUseCase,
)

# --- END IMPORTS ---

router = APIRouter(prefix="/accounts", tags=["Accounts"])


@router.post("", response_model=ApiResponse[Account], status_code=201)
@inject
async def create_new_account(
    request: CreateAccountRequest = Body(...),
    use_case: CreateAccountUseCase = Depends(
        Provide[Container.create_account_use_case]
    ),
):
    account = await use_case.execute(email=request.email, password=request.password)
    # We return a 201 status, so the body should also be present.
    return ApiResponse[Account](ok=True, data=account, error=None)


@router.get("/{account_id}", response_model=ApiResponse[Account])
@inject
async def get_account_by_id(
    account_id: str,
    use_case: GetAccountUseCase = Depends(Provide[Container.get_account_use_case]),
):
    # The use case now raises NotFoundException, which the handler will catch.
    account = await use_case.execute(account_id)
    return ApiResponse[Account](ok=True, data=account, error=None)


@router.post("/{account_id}/addons", response_model=ApiResponse[dict])
@inject
async def install_addon_for_account(
    account_id: str,
    request: InstallAddonRequest,
    use_case: InstallAddonForAllProfilesUseCase = Depends(
        Provide[Container.install_addon_for_all_profiles_use_case]
    ),
):
    summary = await use_case.execute(account_id, request.manifest_url)
    return ApiResponse[dict](ok=True, data=summary, error=None)


@router.delete("/{account_id}/addons/{manifest_id}", response_model=ApiResponse[dict])
@inject
async def uninstall_addon_from_account(
    account_id: str,
    manifest_id: str,
    use_case: UninstallAddonFromAllProfilesUseCase = Depends(
        Provide[Container.uninstall_addon_from_all_profiles_use_case]
    ),
):
    summary = await use_case.execute(account_id, manifest_id)
    return ApiResponse[dict](ok=True, data=summary, error=None)
