from dependency_injector.wiring import inject, Provide
from fastapi import APIRouter, Depends, Body
from fastapi_factory.responses import create_success_response, SuccessResponse

from app.containers import Container
from app.services.services import IAccountService, IProfileService
from core.pydantic.auth.user.account import (
    Account,
    CreateAccountRequest,
    InstallAddonRequest,
)


router = APIRouter(prefix="/accounts", tags=["Accounts"])


@router.post("", response_model=SuccessResponse[Account], status_code=201)
@inject
async def create_new_account(
    request: CreateAccountRequest = Body(...),
    account_service: IAccountService = Depends(Provide[Container.account_service]),
):
    account = await account_service.create_account(
        email=request.email, password=request.password
    )
    return create_success_response(data=account, status_code=201)


@router.get("/{account_id}", response_model=SuccessResponse[Account])
@inject
async def get_account_by_id(
    account_id: str,
    account_service: IAccountService = Depends(Provide[Container.account_service]),
):
    account = await account_service.get_account_by_id(account_id)
    return create_success_response(data=account)


@router.post("/{account_id}/addons", response_model=SuccessResponse[dict])
@inject
async def install_addon_for_account(
    account_id: str,
    request: InstallAddonRequest,
    profile_service: IProfileService = Depends(Provide[Container.profile_service]),
):
    summary = await profile_service.install_addon_for_all_profiles(
        account_id, request.manifest_url
    )
    return create_success_response(data=summary)


@router.delete(
    "/{account_id}/addons/{manifest_id}", response_model=SuccessResponse[dict]
)
@inject
async def uninstall_addon_from_account(
    account_id: str,
    manifest_id: str,
    profile_service: IProfileService = Depends(Provide[Container.profile_service]),
):
    summary = await profile_service.uninstall_addon_from_all_profiles(
        account_id, manifest_id
    )
    return create_success_response(data=summary)
