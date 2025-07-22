from dependency_injector.wiring import inject, Provide
from fastapi import APIRouter, Depends, Query
from fastapi_factory.responses import create_success_response, SuccessResponse

from ...containers import Container
from .models import CatalogRequestModel, MetaRequestModel
from core.pydantic.addons.manifest import AddonManifest
from core.pydantic.catalog.catalog import CatalogResponse
from core.pydantic.meta.meta import MetaResponse

# Import Use Cases
from ...use_cases.get_manifest import GetManifestUseCase
from ...use_cases.get_catalog import GetCatalogUseCase
from ...use_cases.get_meta import GetMetaUseCase

router = APIRouter()


@router.get("/manifest", response_model=SuccessResponse[AddonManifest])
@inject
async def get_addon_manifest(
    url: str = Query(..., description="The URL of the addon's manifest.json"),
    use_case: GetManifestUseCase = Depends(Provide[Container.get_manifest_use_case]),
):
    manifest = await use_case.execute(url)
    return create_success_response(data=manifest)


@router.post("/catalog", response_model=SuccessResponse[CatalogResponse])
@inject
async def get_addon_catalog(
    request: CatalogRequestModel,
    use_case: GetCatalogUseCase = Depends(Provide[Container.get_catalog_use_case]),
):
    catalog = await use_case.execute(
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
    request: MetaRequestModel,
    use_case: GetMetaUseCase = Depends(Provide[Container.get_meta_use_case]),
):
    meta = await use_case.execute(
        manifest_url=request.manifest_url,
        item_id=item_id,
        item_type=request.item_type,
    )
    return create_success_response(data=meta)
