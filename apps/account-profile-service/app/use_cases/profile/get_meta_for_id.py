from typing import Optional
from http_client_factory.client import ApiClient
from core.pydantic.meta.meta import MetaItem
from core.utils.logging import log_warn
from urllib.parse import quote


class GetMetaForIdUseCase:
    def __init__(self, api_client: ApiClient, ADDON_CONTROLLER_SERVICE_URL: str):
        self.api_client = api_client
        self.ADDON_CONTROLLER_SERVICE_URL = ADDON_CONTROLLER_SERVICE_URL

    async def execute(
        self, profile_id: str, content_id: str, item_type: str
    ) -> Optional[MetaItem]:

        # URL-encode the content_id to handle special characters safely.
        encoded_content_id = quote(content_id)

        url = (
            f"{self.ADDON_CONTROLLER_SERVICE_URL}/internal/v1/meta/"
            f"{profile_id}/{item_type}/{encoded_content_id}"
        )

        response = await self.api_client.get(url, response_model=MetaItem)

        if not response.ok or not response.data:
            log_warn(
                "Failed to get meta for content_id during playback update.",
                data={
                    "content_id": content_id,
                    "error": (
                        response.error.dev_message
                        if response.error
                        else "Unknown error"
                    ),
                },
            )
            return None

        return response.data
