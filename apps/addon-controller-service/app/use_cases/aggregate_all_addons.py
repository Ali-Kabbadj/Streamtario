import asyncio
from typing import List, Dict, Any, Tuple
from app.domain.providers.i_external_addon_provider import IExternalAddonProvider
from core.pydantic.addons.manifest import AddonManifest, Catalog as ManifestCatalog
from core.pydantic.catalog.catalog import CatalogResponse, CatalogItem
from core.pydantic.meta.meta import MetaResponse, MetaItem
from domain_exceptions.exceptions import AddonProviderException, NotFoundException
from core.utils.logging import log_info, log_error
from .get_manifest import GetManifestUseCase
from .get_meta import GetMetaUseCase
from core.utils.logging import log_warn


class AggregateAllAddonsUseCase:
    """
    Orchestrates fetching, filtering, and aggregating data from a list of addon manifests
    based on a technical, internal request from the Gateway.
    """

    def __init__(
        self,
        get_manifest_use_case: GetManifestUseCase,
        get_meta_use_case: GetMetaUseCase,
        addon_provider: IExternalAddonProvider,
    ):
        self.get_manifest_use_case = get_manifest_use_case
        self.get_meta_use_case = get_meta_use_case
        self.addon_provider = addon_provider

    async def _fetch_manifest_and_pair_with_url(
        self, url: str
    ) -> Tuple[str, AddonManifest | None]:
        """Helper to fetch a manifest and return it with its original URL."""
        try:
            manifest = await self.get_manifest_use_case.execute(url)
            return url, manifest
        except Exception:
            log_error(f"Failed to fetch or validate manifest at {url}")
            return url, None

    async def get_catalogs(
        self,
        manifest_urls: List[str],
        item_type: str,
        catalog_name: str,
        extra_props: Dict[str, Any],
    ) -> List[CatalogItem]:
        """Fetches and interleaves catalog items from all relevant addons."""
        url_manifest_pairs = await asyncio.gather(
            *[self._fetch_manifest_and_pair_with_url(url) for url in manifest_urls]
        )

        tasks = []
        for manifest_base_url, manifest in url_manifest_pairs:
            if not manifest:
                continue

            for catalog in manifest.catalogs:
                # We match on the catalog's 'type' and 'name'
                if catalog.type == item_type and catalog.name == catalog_name:

                    # --- FIX: Correctly format the extra properties for the URL path ---
                    # According to Stremio spec, it's /catalog/type/id/prop1=val1&prop2=val2.json
                    # Let's re-verify this. The docs say: /catalog/{type}/{id}/{extraArgs}.json
                    # where extraArgs is stringified. Example: "search=tron&skip=100"
                    # The properties themselves should be joined by '&'.
                    extra_args_list = [
                        f"{k}={v}" for k, v in extra_props.items() if v is not None
                    ]
                    extra_args_str = "&".join(extra_args_list)

                    catalog_path = f"catalog/{catalog.type}/{catalog.id}"

                    if extra_args_str:
                        # Append the stringified extra args as a single path segment
                        catalog_path += f"/{extra_args_str}"

                    # Construct the full URL
                    full_url = (
                        f"{manifest_base_url.rsplit('/', 1)[0]}/{catalog_path}.json"
                    )

                    log_info(f"Queueing catalog fetch from: {full_url}")
                    tasks.append(
                        self.addon_provider.get(
                            full_url, response_model=CatalogResponse
                        )
                    )

        list_of_responses: List[CatalogResponse | None] = await asyncio.gather(*tasks)

        # --- FIX: Ensure we process the responses correctly ---
        list_of_item_lists = []
        for res in list_of_responses:
            if res and hasattr(res, "items") and res.items is not None:
                list_of_item_lists.append(res.items)
            elif res:
                # This case handles if the response is valid but has no items array
                # or it's empty, which is valid.
                log_warn(
                    f"Response received but contains no 'items' attribute or it's None.",
                    data=res,
                )
            else:
                # This case handles a complete failure to fetch or parse.
                log_warn("A catalog fetch task returned None.")

        # Interleave and deduplicate results
        combined_items: List[CatalogItem] = []
        seen_ids = set()
        if list_of_item_lists:
            max_len = max(
                (len(item_list) for item_list in list_of_item_lists), default=0
            )
            for i in range(max_len):
                for item_list in list_of_item_lists:
                    if i < len(item_list):
                        item = item_list[i]
                        if item.id not in seen_ids:
                            combined_items.append(item)
                            seen_ids.add(item.id)

        log_info(f"Aggregated a total of {len(combined_items)} items.")
        return combined_items

    async def get_meta(
        self, manifest_urls: List[str], item_type: str, item_id: str
    ) -> MetaItem | None:
        """Finds the correct addon and fetches metadata for a single item."""
        if ":" not in item_id:
            raise NotFoundException("Item with invalid ID format", item_id)

        item_prefix_part = item_id.split(":")[0]
        log_info(f"Looking for provider for meta with prefix: '{item_prefix_part}'")

        url_manifest_pairs = await asyncio.gather(
            *[self._fetch_manifest_and_pair_with_url(url) for url in manifest_urls]
        )

        responsible_manifest_url = None
        debug_lookups = {}
        for url, manifest in url_manifest_pairs:
            if not manifest:
                continue

            meta_resource = next(
                (res for res in manifest.resources if res.name == "meta"), None
            )
            if not meta_resource:
                debug_lookups[manifest.id] = "No 'meta' resource found."
                continue

            prefixes = meta_resource.id_prefixes or manifest.id_prefixes or []
            normalized_prefixes = [p.rstrip(":") for p in prefixes]
            debug_lookups[manifest.id] = (
                f"Checked against prefixes: {normalized_prefixes}"
            )

            if item_prefix_part in normalized_prefixes:
                log_info(f"Found responsible manifest: '{manifest.id}' at url {url}")
                responsible_manifest_url = url
                break

        if not responsible_manifest_url:
            raise AddonProviderException(
                looking_for=f"Metadata for prefix '{item_prefix_part}'",
                attempted_lookups=debug_lookups,
            )

        meta_response = await self.get_meta_use_case.execute(
            manifest_url=responsible_manifest_url,
            item_id=item_id,
            item_type=item_type,
        )

        return meta_response.meta if meta_response else None
