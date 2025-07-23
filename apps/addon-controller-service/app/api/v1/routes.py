from dependency_injector.wiring import inject, Provide
from fastapi import APIRouter, Depends, Query

# --- UPDATED IMPORTS ---
from api_contract.responses import ApiResponse
from api_contract.requests import CatalogRequest, MetaRequest
from core.pydantic.addons.manifest import AddonManifest
from core.pydantic.catalog.catalog import CatalogResponse
from core.pydantic.meta.meta import MetaResponse
from ...containers import Container
from ...use_cases.get_manifest import GetManifestUseCase
from ...use_cases.get_catalog import GetCatalogUseCase
from ...use_cases.get_meta import GetMetaUseCase

# --- END IMPORTS ---

router = APIRouter()


@router.get("/manifest", response_model=ApiResponse[AddonManifest])
@inject
async def get_addon_manifest(
    url: str = Query(..., description="The URL of the addon's manifest.json"),
    use_case: GetManifestUseCase = Depends(Provide[Container.get_manifest_use_case]),
):
    manifest = await use_case.execute(url)
    return ApiResponse[AddonManifest](ok=True, data=manifest, error=None)


@router.post("/catalog", response_model=ApiResponse[CatalogResponse])
@inject
async def get_addon_catalog(
    request: CatalogRequest,  # Use the new shared model
    use_case: GetCatalogUseCase = Depends(Provide[Container.get_catalog_use_case]),
):
    catalog = await use_case.execute(
        manifest_url=request.manifest_url,
        catalog_type=request.catalog_type,
        catalog_id=request.catalog_id,
        extra_props=request.extra_props,
    )
    return ApiResponse[CatalogResponse](ok=True, data=catalog, error=None)


@router.post("/meta/{item_id}", response_model=ApiResponse[MetaResponse])
@inject
async def get_addon_meta(
    item_id: str,
    request: MetaRequest,
    use_case: GetMetaUseCase = Depends(Provide[Container.get_meta_use_case]),
):
    meta = await use_case.execute(
        manifest_url=request.manifest_url,
        item_id=item_id,
        item_type=request.item_type,
    )
    return ApiResponse[MetaResponse](ok=True, data=meta, error=None)
