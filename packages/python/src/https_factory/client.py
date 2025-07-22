from typing import Type, Union
import httpx
from pydantic import BaseModel, ValidationError
from .models import SuccessResponse, ErrorResponse


class ApiClient:
    def __init__(self, client: httpx.AsyncClient | None = None):
        self._client = client or httpx.AsyncClient(
            http2=True, follow_redirects=True, timeout=15.0
        )

    async def get[T: BaseModel](
        self, url: str, response_model: Type[T]
    ) -> Union[SuccessResponse[T], ErrorResponse]:
        """Performs a GET request and validates the response."""
        try:
            response = await self._client.get(url)
            response.raise_for_status()

            # Now we have two points of failure: JSON decoding and Pydantic validation
            raw_data = response.json()
            validated_data = response_model.model_validate(raw_data)

            return SuccessResponse[T](
                status_code=response.status_code, data=validated_data
            )

        except httpx.HTTPStatusError as e:
            return ErrorResponse(
                status_code=e.response.status_code,
                error_message=f"HTTP Error: {e.response.status_code}",
                details=str(e),
            )
        except httpx.RequestError as e:
            return ErrorResponse(
                status_code=503, error_message="Service Unavailable", details=str(e)
            )
        except ValidationError as e:
            return ErrorResponse(
                status_code=422,
                error_message="Response validation failed",
                details=e.errors(),
            )
        except Exception as e:
            return ErrorResponse(
                status_code=500,
                error_message="An unexpected client error occurred",
                details=str(e),
            )

    async def close(self):
        await self._client.aclose()
