import asyncio
import json
from typing import AsyncGenerator, Dict, List, Optional
from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession
from .services import IProfileService
from ..repositories.profile_repository import ProfileRepository
from ..repositories.account_repository import AccountRepository
from core.pydantic.auth.user.account import InstalledAddon
from core.pydantic.addons.manifest import AddonManifest
from core.utils.logging import log_info, log_warn
from https_factory.client import ApiClient
from https_factory.models import ErrorResponse
from fastapi_factory.exceptions import (
    NotFoundException,
    ValidationException,
    ConflictException,
    AddonProviderException,
)
from urllib.parse import urlencode
from core.pydantic.catalog.catalog import (
    CatalogResponse,
    DiscoveredCatalog,
    AddonSearchResult,
)
from core.utils.logging import log_error
from core.pydantic.meta.meta import MetaResponse


class ProfileService(IProfileService):
    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession],
        api_client: ApiClient,
        addon_controller_url: str,
    ):
        self.session_factory = session_factory
        self.api_client = api_client
        self.addon_controller_url = addon_controller_url

    async def install_addon(self, profile_id: str, manifest_url: str) -> InstalledAddon:
        async with self.session_factory() as session:
            repo = ProfileRepository(session)
            profile_orm = await repo.get_by_id(profile_id)
            if not profile_orm:
                raise NotFoundException("Profile", profile_id)

            if any(
                addon.manifest_url == manifest_url
                for addon in profile_orm.installed_addons
            ):
                raise ConflictException(
                    "InstalledAddon", manifest_url, {"profile_id": profile_id}
                )

            params = urlencode({"url": manifest_url})
            full_url = f"{self.addon_controller_url}/api/v1/manifest?{params}"

            manifest_response = await self.api_client.get(
                url=full_url, response_model=AddonManifest
            )

            if isinstance(manifest_response, ErrorResponse):
                raise ValidationException(
                    "The manifest URL is invalid or could not be reached.",
                    manifest_response.details,
                )

            validated_manifest = manifest_response.data

            from core.database.models.auth.addon import InstalledAddonOrm

            new_addon_orm = InstalledAddonOrm(
                profile_id=profile_id,
                manifest_url=manifest_url,
                manifest_id=validated_manifest.id,
            )

            saved_addon_orm = await repo.add_addon(new_addon_orm)
            await session.commit()
            log_info(
                f"Successfully installed addon '{validated_manifest.id}' for profile '{profile_id}'"
            )
            return InstalledAddon.model_validate(saved_addon_orm)

    async def uninstall_addon(self, profile_id: str, manifest_id: str) -> None:
        async with self.session_factory() as session:
            repo = ProfileRepository(session)
            deleted = await repo.remove_addon(profile_id, manifest_id)
            if not deleted:
                raise NotFoundException("Addon with manifest_id", manifest_id)
            await session.commit()
            log_info(
                f"Successfully uninstalled addon '{manifest_id}' from profile '{profile_id}'"
            )

    async def install_addon_for_all_profiles(
        self, account_id: str, manifest_url: str
    ) -> dict:
        async with self.session_factory() as session:
            account_repo = AccountRepository(session)
            account_orm = await account_repo.get_by_id(account_id)
            if not account_orm:
                raise NotFoundException("Account", account_id)

            results = {"success": [], "skipped": []}
            for profile in account_orm.profiles:
                try:
                    installed = await self.install_addon(profile.id, manifest_url)
                    results["success"].append(
                        {"profile_id": profile.id, "addon_id": installed.id}
                    )
                except ConflictException:
                    results["skipped"].append(
                        {"profile_id": profile.id, "reason": "Already installed."}
                    )
            log_info(
                f"Completed account-wide install for '{manifest_url}' on account '{account_id}'"
            )
            return results

    async def uninstall_addon_from_all_profiles(
        self, account_id: str, manifest_id: str
    ) -> dict:
        async with self.session_factory() as session:
            repo = ProfileRepository(session)
            account_repo = AccountRepository(session)
            # Check account exists
            if not await account_repo.get_by_id(account_id):
                raise NotFoundException("Account", account_id)

            deleted_count = await repo.remove_addons_by_account(account_id, manifest_id)
            if deleted_count == 0:
                raise NotFoundException("Addon with manifest_id", manifest_id)

            await session.commit()
            summary = {
                "manifest_id": manifest_id,
                "deleted_from_profiles": deleted_count,
            }
            log_info(
                f"Completed account-wide uninstall of '{manifest_id}' for account '{account_id}'",
                data=summary,
            )
            return summary

    async def get_addon_catalog(
        self,
        profile_id: str,
        manifest_id: str,
        catalog_type: str,
        catalog_id: str,
        extra_props: dict,
    ) -> CatalogResponse:
        async with self.session_factory() as session:
            repo = ProfileRepository(session)
            profile_orm = await repo.get_by_id(profile_id)
            if not profile_orm:
                raise NotFoundException("Profile", profile_id)

            installed_addon = next(
                (
                    addon
                    for addon in profile_orm.installed_addons
                    if addon.manifest_id == manifest_id
                ),
                None,
            )
            if not installed_addon:
                raise NotFoundException("Installed Addon with manifest_id", manifest_id)

            log_info(
                f"Proxying catalog request for profile '{profile_id}' to addon-controller."
            )

            from core.pydantic.catalog.catalog import CatalogRequest

            catalog_request = CatalogRequest(
                manifestUrl=installed_addon.manifest_url,
                catalogType=catalog_type,
                catalogId=catalog_id,
                extraProps=extra_props,
            )

            response = await self.api_client.post(
                url=f"{self.addon_controller_url}/api/v1/catalog",
                json=catalog_request.model_dump(by_alias=True),
                response_model=CatalogResponse,
            )

            if isinstance(response, ErrorResponse):
                # 1. Propagate 404s correctly
                if response.status_code == 404:
                    raise NotFoundException(
                        entity_name="Catalog in external addon",
                        identifier=f"{catalog_type}/{catalog_id}",
                    )
                raise ValidationException(
                    message=response.error_message, details=response.details
                )

            return response.data

    async def _fetch_manifests_for_profile(self, profile_orm) -> List[AddonManifest]:
        """Fetches all manifests for a profile's installed addons concurrently."""

        async def _fetch_manifest(addon_orm):
            manifest_response = await self.api_client.get(
                url=f"{self.addon_controller_url}/api/v1/manifest?url={addon_orm.manifest_url}",
                response_model=AddonManifest,
            )
            if isinstance(manifest_response, ErrorResponse):
                log_error(
                    f"Failed to fetch manifest for {addon_orm.manifest_id}",
                    data=manifest_response.details,
                )
                return None
            return manifest_response.data

        tasks = [_fetch_manifest(addon) for addon in profile_orm.installed_addons]
        manifests = await asyncio.gather(*tasks)
        return [m for m in manifests if m is not None]

    async def discover_catalogs(self, profile_id: str) -> List[DiscoveredCatalog]:
        async with self.session_factory() as session:
            repo = ProfileRepository(session)
            profile_orm = await repo.get_by_id(profile_id)
            if not profile_orm:
                raise NotFoundException("Profile", profile_id)

            # --- REFACTOR to use the new helper method ---
            manifests = await self._fetch_manifests_for_profile(profile_orm)

            all_catalogs = []
            for manifest in manifests:
                for catalog in manifest.catalogs:
                    all_catalogs.append(
                        DiscoveredCatalog(
                            addonName=manifest.name,
                            manifestId=manifest.id,
                            catalogId=catalog.id,
                            catalogName=catalog.name,
                            catalogType=catalog.type,
                            extraProps=(
                                [
                                    extra.model_dump(by_alias=True)
                                    for extra in catalog.extra
                                ]
                                if catalog.extra
                                else []
                            ),
                        )
                    )
            return all_catalogs

    async def search_all_addons(self, profile_id: str, query: str) -> dict:
        all_catalogs = await self.discover_catalogs(profile_id)
        search_enabled_catalogs = [
            cat
            for cat in all_catalogs
            if any(prop.get("name") == "search" for prop in cat.extra_props)
        ]

        async def _fetch_search_results(catalog: DiscoveredCatalog):
            try:
                catalog_data = await self.get_addon_catalog(
                    profile_id=profile_id,
                    manifest_id=catalog.manifest_id,
                    catalog_type=catalog.catalog_type,
                    catalog_id=catalog.catalog_id,
                    extra_props={"search": query},
                )
                return (
                    catalog.manifest_id,
                    catalog.addon_name,
                    catalog.catalog_type,
                    catalog_data.items,
                )
            except Exception as e:
                log_error(
                    f"Search failed for addon '{catalog.manifest_id}'",
                    data={"error": str(e)},
                )
                return None

        tasks = [_fetch_search_results(catalog) for catalog in search_enabled_catalogs]
        results = await asyncio.gather(*tasks)

        grouped_results: Dict[str, AddonSearchResult] = {}
        for res in results:
            if res is None:
                continue

            manifest_id, addon_name, catalog_type, items = res

            if manifest_id not in grouped_results:
                grouped_results[manifest_id] = AddonSearchResult(
                    addonName=addon_name, resultsByType={}
                )

            # Append the results to the correct type list
            grouped_results[manifest_id].results_by_type[catalog_type] = items

        return grouped_results

    async def stream_search_all_addons(
        self, profile_id: str, query: str
    ) -> AsyncGenerator[str, None]:
        all_catalogs = await self.discover_catalogs(profile_id)
        search_enabled_catalogs = [
            cat
            for cat in all_catalogs
            if any(prop.get("name") == "search" for prop in cat.extra_props)
        ]

        async def _fetch_search_results(catalog: DiscoveredCatalog):
            try:
                catalog_data = await self.get_addon_catalog(
                    profile_id=profile_id,
                    manifest_id=catalog.manifest_id,
                    catalog_type=catalog.catalog_type,
                    catalog_id=catalog.catalog_id,
                    extra_props={"search": query},
                )
                single_group = {
                    catalog.manifest_id: AddonSearchResult(
                        addonName=catalog.addon_name,
                        resultsByType={catalog.catalog_type: catalog_data.items},
                    )
                }
                return single_group
            except Exception as e:
                log_error(
                    f"Search failed for addon '{catalog.manifest_id}'",
                    data={"error": str(e)},
                )
                return None

        tasks = [_fetch_search_results(catalog) for catalog in search_enabled_catalogs]
        for completed_task in asyncio.as_completed(tasks):
            result_group = await completed_task
            if result_group:
                manifest_id, addon_result_model = next(iter(result_group.items()))
                final_json_obj = {
                    manifest_id: addon_result_model.model_dump(by_alias=True)
                }
                json_data = json.dumps(final_json_obj)
                yield f"event: search_result\ndata: {json_data}\n\n"

    async def get_meta(self, profile_id: str, item_id: str) -> MetaResponse:
        log_info(f"--- META REQUEST STARTED for item_id: '{item_id}' ---")
        async with self.session_factory() as session:
            repo = ProfileRepository(session)
            profile_orm = await repo.get_by_id(profile_id)
            if not profile_orm:
                raise NotFoundException("Profile", profile_id)

            if ":" not in item_id:
                raise ValidationException(
                    message="Invalid ID format.", details={"item_id": item_id}
                )

            item_prefix_part = item_id.split(":")[0]
            log_info(f"Extracted item prefix: '{item_prefix_part}'")

            manifests = await self._fetch_manifests_for_profile(profile_orm)
            log_info(f"Fetched {len(manifests)} manifests for profile.")

            debug_lookups = {}
            responsible_manifest = None
            for manifest in manifests:
                log_info(f"Checking manifest: '{manifest.id}'...")

                meta_resource = next(
                    (res for res in manifest.resources if res.name == "meta"), None
                )
                if not meta_resource:
                    log_warn(f"  - No 'meta' resource. Skipping.")
                    debug_lookups[manifest.id] = "No 'meta' resource found."
                    continue

                prefixes_to_check = meta_resource.id_prefixes

                if not prefixes_to_check:
                    log_info(f"  - No prefixes in 'meta' resource, checking top-level.")
                    prefixes_to_check = manifest.id_prefixes

                if not prefixes_to_check:
                    log_warn(
                        f"  - No id_prefixes found in meta resource or at top-level. Skipping."
                    )
                    debug_lookups[manifest.id] = "No id_prefixes found for meta."
                    continue

                normalized_prefixes = [p.rstrip(":") for p in prefixes_to_check]
                log_info(
                    f"  - Checking for prefix '{item_prefix_part}' in {normalized_prefixes}"
                )
                debug_lookups[manifest.id] = (
                    f"Checked against prefixes: {normalized_prefixes}"
                )

                if item_prefix_part in normalized_prefixes:
                    log_info(
                        f"  - SUCCESS: Found responsible manifest: '{manifest.id}'"
                    )
                    responsible_manifest = manifest
                    break

            if not responsible_manifest:
                raise AddonProviderException(
                    looking_for=f"Metadata for prefix '{item_prefix_part}'",
                    attempted_lookups=debug_lookups,
                )

            responsible_addon_orm = next(
                (
                    addon
                    for addon in profile_orm.installed_addons
                    if addon.manifest_id == responsible_manifest.id
                ),
                None,
            )

            if not responsible_addon_orm:
                raise NotFoundException(
                    "Installed Addon record for manifest", responsible_manifest.id
                )

            log_info(
                f"Proxying meta request to addon-controller for manifest: {responsible_addon_orm.manifest_url}"
            )
            meta_response = await self.api_client.post(
                url=f"{self.addon_controller_url}/api/v1/meta/{item_id}",
                json={"manifestUrl": responsible_addon_orm.manifest_url},
                response_model=MetaResponse,
            )

            if isinstance(meta_response, ErrorResponse):
                raise ValidationException(
                    message=meta_response.error_message, details=meta_response.details
                )

            return meta_response.data
