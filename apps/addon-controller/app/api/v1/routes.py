from dependency_injector.wiring import inject, Provide
from fastapi import APIRouter, Depends, Query
from fastapi_factory.responses import create_success_response, SuccessResponse

from ...containers import Container
from ...services.services import IAddonService
from core.pydantic.addons.manifest import AddonManifest

router = APIRouter()


@router.get("/manifest", response_model=SuccessResponse[AddonManifest])
@inject
async def get_addon_manifest(
    url: str = Query(..., description="The URL of the addon's manifest.json"),
    # The dependency is now on the INTERFACE, not the implementation
    addon_service: IAddonService = Depends(Provide[Container.addon_service]),
):
    manifest = await addon_service.get_manifest(url)
    return create_success_response(data=manifest)
