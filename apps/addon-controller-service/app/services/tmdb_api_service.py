from typing import Optional, Tuple
import asyncio
from http_client_factory.public_client import PublicApiClient
from core.pydantic.tmdb_api.tmdb_api import (
    TMDBSearchResponse,
    TMDBPersonDetails,
    TMDBCreditsResponse,
)
from core.utils.logging import log_error, log_info


class TmdbApiService:
    def __init__(self, public_api_client: PublicApiClient, api_key: str):
        self.api_client = public_api_client
        self.api_key = api_key
        self.base_url = "https://api.themoviedb.org/3"
        self.image_base_url = "https://image.tmdb.org/t/p/w500"

    async def search_person(self, name: str) -> Optional[int]:
        """Searches for a person and returns the TMDB ID of the most popular result."""
        if not self.api_key:
            log_error("TMDB API key is not configured.")
            return None

        url = f"{self.base_url}/search/person?api_key={self.api_key}&query={name}"
        response = await self.api_client.get(url, TMDBSearchResponse)

        if response and response.results:
            return response.results[0].id
        return None

    async def get_person_details_and_credits(
        self, person_id: int
    ) -> Tuple[Optional[TMDBPersonDetails], Optional[TMDBCreditsResponse]]:
        """Gets full person details and their combined filmography in parallel."""
        if not self.api_key:
            return None, None

        details_url = f"{self.base_url}/person/{person_id}?api_key={self.api_key}"
        credits_url = f"{self.base_url}/person/{person_id}/combined_credits?api_key={self.api_key}"

        details_task = self.api_client.get(details_url, TMDBPersonDetails)
        credits_task = self.api_client.get(credits_url, TMDBCreditsResponse)

        results = await asyncio.gather(
            details_task, credits_task, return_exceptions=True
        )

        details = results[0] if isinstance(results[0], TMDBPersonDetails) else None
        credits = results[1] if isinstance(results[1], TMDBCreditsResponse) else None

        if isinstance(results[0], Exception):
            log_error(
                f"Failed to fetch TMDB person details for ID {person_id}",
                data={"error": str(results[0])},
            )
        if isinstance(results[1], Exception):
            log_error(
                f"Failed to fetch TMDB person credits for ID {person_id}",
                data={"error": str(results[1])},
            )

        return details, credits
