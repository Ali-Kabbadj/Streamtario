from dependency_injector.wiring import inject, Provide
from fastapi import APIRouter, Depends
from api_contract.responses import ApiResponse
from app.containers import Container
from core.pydantic.domain.addon import InstalledAddon
from core.pydantic.api.profile_api import InstallAddonRequest
from core.pydantic.domain.profile import Profile
from app.use_cases.profile.install_addon import InstallAddonUseCase
from app.use_cases.profile.uninstall_addon import UninstallAddonUseCase
from app.use_cases.profile.get_profile import GetProfileUseCase


router = APIRouter(prefix="/profiles", tags=["Profiles"])


@router.get("/{profile_id}", response_model=ApiResponse[Profile])
@inject
async def get_profile_by_id(
    profile_id: str,
    use_case: GetProfileUseCase = Depends(Provide[Container.get_profile_use_case]),
):
    profile = await use_case.execute(profile_id)
    return ApiResponse[Profile](ok=True, data=profile, error=None)


@router.post(
    "/{profile_id}/addons", response_model=ApiResponse[InstalledAddon], status_code=201
)
@inject
async def install_addon_for_profile(
    profile_id: str,
    request: InstallAddonRequest,
    use_case: InstallAddonUseCase = Depends(Provide[Container.install_addon_use_case]),
):
    addon = await use_case.execute(profile_id, request.manifest_url)
    return ApiResponse[InstalledAddon](ok=True, data=addon, error=None)


@router.delete(
    "/{profile_id}/addons/{manifest_id}",
    response_model=ApiResponse[None],
    status_code=200,
)
@inject
async def uninstall_addon_from_profile(
    profile_id: str,
    manifest_id: str,
    use_case: UninstallAddonUseCase = Depends(
        Provide[Container.uninstall_addon_use_case]
    ),
):
    await use_case.execute(profile_id, manifest_id)
    return ApiResponse[None](ok=True, data=None, error=None)
