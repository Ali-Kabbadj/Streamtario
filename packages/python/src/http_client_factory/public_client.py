import httpx
import json
import asyncio
from typing import Type, Union, Optional
from pydantic import BaseModel, ValidationError


class PublicApiClient:
    """A simple HTTP client for fetching raw data from public, external URLs."""

    def __init__(
        self,
        client: httpx.AsyncClient | None = None,
        retries: int = 2,
        verify: bool = True,
    ):
        self.retries = retries
        self._client_args = {
            "http2": True,
            "follow_redirects": True,
            "timeout": 15.0,
            "verify": verify,
        }
        self._client = client

    async def _get_client(self) -> httpx.AsyncClient:
        if not self._client or self._client.is_closed:
            self._client = httpx.AsyncClient(**self._client_args)
        return self._client

    async def get_raw_response(self, url: str) -> Optional[httpx.Response]:
        client = await self._get_client()
        last_exception = None
        for attempt in range(self.retries):
            try:
                response = await client.get(url)
                return response
            except httpx.RequestError as e:
                last_exception = e
                await asyncio.sleep(0.5 * (attempt + 1))
                continue
        print(f"Failed to fetch public URL {url}. Last error: {last_exception}")
        return None

    async def get[T: BaseModel](
        self, url: str, response_model: Type[T]
    ) -> Union[T, None]:
        response = await self.get_raw_response(url)
        if not response or response.status_code != 200:
            return None

        try:
            return response_model.model_validate(response.json())
        except (ValidationError, json.JSONDecodeError) as e:
            print(f"Failed to validate public URL {url}. Error: {e}")
            return None

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()
