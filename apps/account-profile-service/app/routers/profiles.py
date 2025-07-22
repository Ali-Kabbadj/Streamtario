from typing import List
from dependency_injector.wiring import inject, Provide
from fastapi_factory.responses import create_success_response, SuccessResponse
from app.containers import Container
from app.services.services import IProfileService
from core.pydantic.auth.user.account import InstalledAddon
from fastapi import APIRouter, Depends, Request
from core.pydantic.auth.user.account import InstallAddonRequest
from core.pydantic.catalog.catalog import (
    CatalogResponse,
    DiscoveredCatalog,
)
from starlette.responses import StreamingResponse
from core.pydantic.meta.meta import MetaResponse

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


@router.get(
    "/{profile_id}/catalogs/{manifest_id}/{catalog_type}/{catalog_id}",
    response_model=SuccessResponse[CatalogResponse],
)
@inject
async def get_profile_catalog(
    profile_id: str,
    manifest_id: str,
    catalog_type: str,
    catalog_id: str,
    request: Request,  # Inject request to access query params
    profile_service: IProfileService = Depends(Provide[Container.profile_service]),
):
    """Gets the content catalog for an addon installed on a specific profile."""
    # Extract any extra properties from query params (e.g., ?genre=Action)
    extra_props = dict(request.query_params)

    catalog = await profile_service.get_addon_catalog(
        profile_id=profile_id,
        manifest_id=manifest_id,
        catalog_type=catalog_type,
        catalog_id=catalog_id,
        extra_props=extra_props,
    )
    return create_success_response(data=catalog)


@router.get(
    "/{profile_id}/catalogs/discover",
    response_model=SuccessResponse[List[DiscoveredCatalog]],
)
@inject
async def discover_profile_catalogs(
    profile_id: str,
    profile_service: IProfileService = Depends(Provide[Container.profile_service]),
):
    """
    Discovers all available catalogs from all addons installed on a profile.
    This is used to build the main navigation UI.
    """
    catalogs = await profile_service.discover_catalogs(profile_id=profile_id)
    return create_success_response(data=catalogs)


@router.get("/{profile_id}/search", response_model=SuccessResponse[dict])
@inject
async def search_profile_addons(
    profile_id: str,
    query: str,
    profile_service: IProfileService = Depends(Provide[Container.profile_service]),
):
    """
    Performs a global search across all search-enabled addons on a profile.
    """
    results = await profile_service.search_all_addons(
        profile_id=profile_id, query=query
    )
    return create_success_response(data=results)


@router.get("/{profile_id}/search/stream")
@inject
async def stream_search_profile_addons(
    profile_id: str,
    query: str,
    profile_service: IProfileService = Depends(Provide[Container.profile_service]),
):
    """
    Performs a global search and streams categorized results back to the
    client as they become available using Server-Sent Events.
    """
    results_generator = profile_service.stream_search_all_addons(
        profile_id=profile_id, query=query
    )
    return StreamingResponse(results_generator, media_type="text/event-stream")


@router.get(
    "/{profile_id}/meta/{item_id:path}",  # Use a path converter
    response_model=SuccessResponse[MetaResponse],
)
@inject
async def get_item_meta(
    profile_id: str,
    item_id: str,
    profile_service: IProfileService = Depends(Provide[Container.profile_service]),
):
    """
    Gets detailed metadata for a specific item (movie, series, etc.).
    This endpoint finds the correct installed addon and proxies the request.
    """
    cleaned_item_id = item_id.removesuffix(".json")

    meta = await profile_service.get_meta(
        profile_id=profile_id,
        item_id=cleaned_item_id,
    )
    return create_success_response(data=meta)
