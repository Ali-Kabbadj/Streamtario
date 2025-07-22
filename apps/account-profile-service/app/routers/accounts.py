from dependency_injector.wiring import inject, Provide
from fastapi import APIRouter, Depends, Body
from fastapi_factory.responses import create_success_response, SuccessResponse
from database_factory.db import get_db_session
from sqlalchemy.ext.asyncio import AsyncSession

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

router = APIRouter(prefix="/accounts", tags=["Accounts"])


@router.post("", response_model=SuccessResponse[Account], status_code=201)
@inject
async def create_new_account(
    request: CreateAccountRequest = Body(...),
    use_case: CreateAccountUseCase = Depends(
        Provide[Container.create_account_use_case]
    ),
    # REMOVE: session: AsyncSession = Depends(get_db_session),
):
    # The use case now handles its own session
    account = await use_case.execute(email=request.email, password=request.password)
    return create_success_response(data=account, status_code=201)


@router.get("/{account_id}", response_model=SuccessResponse[Account])
@inject
async def get_account_by_id(
    account_id: str,
    use_case: GetAccountUseCase = Depends(Provide[Container.get_account_use_case]),
):
    account = await use_case.execute(account_id)
    return create_success_response(data=account)


@router.post("/{account_id}/addons", response_model=SuccessResponse[dict])
@inject
async def install_addon_for_account(
    account_id: str,
    request: InstallAddonRequest,
    use_case: InstallAddonForAllProfilesUseCase = Depends(
        Provide[Container.install_addon_for_all_profiles_use_case]
    ),
):
    summary = await use_case.execute(account_id, request.manifest_url)
    return create_success_response(data=summary)


@router.delete(
    "/{account_id}/addons/{manifest_id}", response_model=SuccessResponse[dict]
)
@inject
async def uninstall_addon_from_account(
    account_id: str,
    manifest_id: str,
    use_case: UninstallAddonFromAllProfilesUseCase = Depends(
        Provide[Container.uninstall_addon_from_all_profiles_use_case]
    ),
):
    summary = await use_case.execute(account_id, manifest_id)
    return create_success_response(data=summary)
