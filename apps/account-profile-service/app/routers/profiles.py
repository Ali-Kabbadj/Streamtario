from typing import List
from dependency_injector.wiring import inject, Provide
from fastapi import APIRouter, Depends, Request
from starlette.responses import StreamingResponse

# --- UPDATED IMPORTS ---
from api_contract.responses import ApiResponse
from app.containers import Container
from core.pydantic.domain.addon import InstalledAddon
from core.pydantic.api.profile_api import InstallAddonRequest
from core.pydantic.catalog.catalog import CatalogResponse, DiscoveredCatalog
from core.pydantic.meta.meta import MetaResponse
from app.use_cases.profile.install_addon import InstallAddonUseCase
from app.use_cases.profile.uninstall_addon import UninstallAddonUseCase
from app.use_cases.profile.get_addon_catalog import GetAddonCatalogUseCase
from app.use_cases.profile.discover_catalogs import DiscoverCatalogsUseCase
from app.use_cases.profile.get_item_meta import GetItemMetaUseCase
from app.use_cases.profile.search_catalog import SearchCatalogUseCase
from app.use_cases.profile.stream_search_catalog import StreamSearchCatalogCase

# --- END IMPORTS ---

router = APIRouter(prefix="/profiles", tags=["Profiles"])


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


@router.get(
    "/{profile_id}/catalogs/{manifest_id}/{catalog_type}/{catalog_id}",
    response_model=ApiResponse[CatalogResponse],
)
@inject
async def get_profile_catalog(
    profile_id: str,
    manifest_id: str,
    catalog_type: str,
    catalog_id: str,
    request: Request,
    use_case: GetAddonCatalogUseCase = Depends(
        Provide[Container.get_addon_catalog_use_case]
    ),
):
    extra_props = dict(request.query_params)
    catalog = await use_case.execute(
        profile_id, manifest_id, catalog_type, catalog_id, extra_props
    )
    return ApiResponse[CatalogResponse](ok=True, data=catalog, error=None)


@router.get(
    "/{profile_id}/catalogs/discover",
    response_model=ApiResponse[List[DiscoveredCatalog]],
)
@inject
async def discover_profile_catalogs(
    profile_id: str,
    use_case: DiscoverCatalogsUseCase = Depends(
        Provide[Container.discover_catalogs_use_case]
    ),
):
    catalogs = await use_case.execute(profile_id)
    return ApiResponse[List[DiscoveredCatalog]](ok=True, data=catalogs, error=None)


@router.get("/{profile_id}/search", response_model=ApiResponse[dict])
@inject
async def search_profile_addons(
    profile_id: str,
    query: str,
    use_case: SearchCatalogUseCase = Depends(
        Provide[Container.search_all_addons_use_case]
    ),
):
    results = await use_case.execute(profile_id, query)
    return ApiResponse[dict](ok=True, data=results, error=None)


@router.get("/{profile_id}/search/stream")
@inject
async def stream_search_profile_addons(
    profile_id: str,
    query: str,
    use_case: StreamSearchCatalogCase = Depends(
        Provide[Container.stream_search_all_addons_use_case]
    ),
):
    results_generator = use_case.execute(profile_id, query)
    return StreamingResponse(results_generator, media_type="text/event-stream")


@router.get(
    "/{profile_id}/meta/{item_type}/{item_id:path}",
    response_model=ApiResponse[MetaResponse],
)
@inject
async def get_item_meta(
    profile_id: str,
    item_type: str,
    item_id: str,
    use_case: GetItemMetaUseCase = Depends(Provide[Container.get_item_meta_use_case]),
):
    meta = await use_case.execute(profile_id, item_type, item_id)
    return ApiResponse[MetaResponse](ok=True, data=meta, error=None)
