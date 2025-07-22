from dependency_injector.wiring import inject, Provide
from fastapi import APIRouter, Depends, Body
from fastapi_factory.responses import create_success_response, SuccessResponse
from app.containers import Container
from app.schemas.requests import InstallAddonRequest
from app.services.services import IProfileService
from core.pydantic.auth.user.account import InstalledAddon

router = APIRouter(prefix="/profiles", tags=["Profiles"])


@router.post(
    "/{profile_id}/addons",
    response_model=SuccessResponse[InstalledAddon],
    status_code=201,
)
@inject
async def install_addon_for_profile(
    profile_id: str,
    request: InstallAddonRequest,
    profile_service: IProfileService = Depends(Provide[Container.profile_service]),
):
    addon = await profile_service.install_addon(profile_id, request.manifest_url)
    return create_success_response(data=addon, status_code=201)


@router.delete("/{profile_id}/addons/{manifest_id}", status_code=204)
@inject
async def uninstall_addon_from_profile(
    profile_id: str,
    manifest_id: str,
    profile_service: IProfileService = Depends(Provide[Container.profile_service]),
):
    await profile_service.uninstall_addon(profile_id, manifest_id)
    return None
