import httpx
import json
import asyncio
from typing import Type, Union
from pydantic import BaseModel, ValidationError


class PublicApiClient:
    """A simple HTTP client for fetching raw data from public, external URLs."""

    def __init__(self, client: httpx.AsyncClient | None = None, retries: int = 2):
        self.retries = retries
        self._client_args = {"http2": True, "follow_redirects": True, "timeout": 15.0}
        self._client = client

    async def _get_client(self) -> httpx.AsyncClient:
        if not self._client or self._client.is_closed:
            self._client = httpx.AsyncClient(**self._client_args)
        return self._client

    async def get[T: BaseModel](
        self, url: str, response_model: Type[T]
    ) -> Union[T, None]:
        client = await self._get_client()
        last_exception = None
        for attempt in range(self.retries):
            try:
                response = await client.get(url)
                response.raise_for_status()
                # It directly validates the raw JSON into the target model
                return response_model.model_validate(response.json())
            except (httpx.HTTPStatusError, httpx.RequestError) as e:
                last_exception = e
                await asyncio.sleep(0.5 * (attempt + 1))
                continue
            except (ValidationError, json.JSONDecodeError) as e:
                # If validation fails, it's a hard failure for this simple client.
                last_exception = e
                break  # Don't retry on bad data
        print(f"Failed to fetch public URL {url}. Last error: {last_exception}")
        return None

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()
