from dependency_injector.wiring import inject, Provide
from fastapi import APIRouter, Body, Depends, Query
from fastapi_factory.responses import create_success_response, SuccessResponse

from ...containers import Container
from ...services.services import IAddonService
from core.pydantic.addons.manifest import AddonManifest
from core.pydantic.catalog.catalog import CatalogResponse, CatalogRequest
from core.pydantic.meta.meta import MetaResponse
from ...services.services import IAddonService

router = APIRouter()


@router.get("/manifest", response_model=SuccessResponse[AddonManifest])
@inject
async def get_addon_manifest(
    url: str = Query(..., description="The URL of the addon's manifest.json"),
    addon_service: IAddonService = Depends(Provide[Container.addon_service]),
):
    manifest = await addon_service.get_manifest(url)
    return create_success_response(data=manifest)


@router.post("/catalog", response_model=SuccessResponse[CatalogResponse])
@inject
async def get_addon_catalog(
    request: CatalogRequest,
    addon_service: IAddonService = Depends(Provide[Container.addon_service]),
):
    """[INTERNAL] Fetches a content catalog from an addon's manifest URL."""
    catalog = await addon_service.get_catalog(
        manifest_url=request.manifest_url,
        catalog_type=request.catalog_type,
        catalog_id=request.catalog_id,
        extra_props=request.extra_props,
    )
    return create_success_response(data=catalog)


@router.post("/meta/{item_id}", response_model=SuccessResponse[MetaResponse])
@inject
async def get_addon_meta(
    item_id: str,
    manifest_url: str = Body(..., embed=True, alias="manifestUrl"),
    addon_service: IAddonService = Depends(Provide[Container.addon_service]),
):
    """[INTERNAL] Fetches detailed metadata for an item from an addon."""
    meta = await addon_service.get_meta(
        manifest_url=manifest_url,
        item_id=item_id,
    )
    return create_success_response(data=meta)
