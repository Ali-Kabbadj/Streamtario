import asyncio
from typing import Optional, List
import redis.asyncio as redis
from core.pydantic.meta.person import PersonDetails, FilmographyItem, ExternalLink
from core.utils.logging import log_error, log_info, log_cache, log_warn
from app.services.tmdb_api_service import TmdbApiService

PERSON_CACHE_KEY_PREFIX = "person_details_v5_tmdb_only:"
PERSON_CACHE_TTL_SECONDS = 60 * 60 * 24 * 30


class GetPersonDetailsUseCase:
    def __init__(
        self,
        redis_client: redis.Redis,
        tmdb_api_service: TmdbApiService,
    ):
        self.redis_client = redis_client
        self.tmdb_api_service = tmdb_api_service

    async def execute(self, person_name: str) -> Optional[PersonDetails]:
        cache_key = f"{PERSON_CACHE_KEY_PREFIX}{person_name.lower().replace(' ', '_')}"
        try:
            cached_data = await self.redis_client.get(cache_key)
            if cached_data:
                log_cache(f"Cache HIT for person details: '{person_name}'")
                return PersonDetails.model_validate_json(cached_data)
        except Exception as e:
            log_error(f"Redis GET failed for '{person_name}'", data={"error": str(e)})

        log_cache(f"Cache MISS for person details: '{person_name}'")

        # Step 1: Find the TMDB ID for the person.
        tmdb_id = await self.tmdb_api_service.search_person(person_name)
        if not tmdb_id:
            log_warn(f"Could not find a TMDB ID for '{person_name}'.")
            return None

        log_info(f"Found TMDB ID '{tmdb_id}' for '{person_name}'. Fetching details.")

        # Step 2: Fetch details and credits from TMDB in parallel.
        details, credits = await self.tmdb_api_service.get_person_details_and_credits(
            tmdb_id
        )

        if not details:
            log_error(f"Failed to get person details for TMDB ID '{tmdb_id}'")
            return None

        # Step 3: Map the rich TMDB data to our internal PersonDetails model.
        filmography = []
        if credits:
            all_credits = credits.cast + credits.crew
            # Sort by popularity or release date if available
            all_credits.sort(
                key=lambda x: x.release_date or x.first_air_date or "0", reverse=True
            )
            for credit in all_credits:
                title = credit.title or credit.name
                year = (credit.release_date or credit.first_air_date or "N/A").split(
                    "-"
                )[0]
                role = credit.character or credit.job or "Unknown"
                if title and role:
                    filmography.append(
                        FilmographyItem(
                            title=title,
                            year=year,
                            role=role,
                            type=credit.media_type.capitalize(),
                        )
                    )

        person_details = PersonDetails(
            name=details.name,
            birthName=details.name,
            summary=details.known_for_department,
            biography=details.biography,
            birthDate=details.birthday,  # Direct assignment
            birthPlace=details.place_of_birth,
            deathDate=details.deathday,  # Direct assignment
            deathLocation=None,
            imageUrl=(
                f"{self.tmdb_api_service.image_base_url}{details.profile_path}"
                if details.profile_path
                else None
            ),
            professions=(
                [details.known_for_department] if details.known_for_department else []
            ),
            filmography=filmography,
            externalLinks=[
                ExternalLink(
                    site="TMDB", url=f"https://www.themoviedb.org/person/{details.id}"
                )
            ],
        )

        try:
            await self.redis_client.set(
                cache_key,
                person_details.model_dump_json(by_alias=True),
                ex=PERSON_CACHE_TTL_SECONDS,
            )
            log_cache(f"Successfully cached person details for '{person_name}'")
        except Exception as e:
            log_error(f"Redis SET failed for '{person_name}'", data={"error": str(e)})

        return person_details
