from dependency_injector.wiring import inject, Provide
from fastapi import APIRouter, Depends, Query
from api_contract.responses import ApiResponse
from core.pydantic.addons.manifest import AddonManifest
from ...containers import Container
from ...use_cases.get_manifest import GetManifestUseCase


router = APIRouter()


@router.get("/manifest", response_model=ApiResponse[AddonManifest])
@inject
async def get_addon_manifest(
    url: str = Query(..., description="The URL of the addon's manifest.json"),
    use_case: GetManifestUseCase = Depends(Provide[Container.get_manifest_use_case]),
):
    """
    Internal endpoint for validating a manifest URL and retrieving its content.
    This is primarily used by the account-profile-service during addon installation.
    """
    manifest = await use_case.execute(url)
    return ApiResponse[AddonManifest](ok=True, data=manifest, error=None)
