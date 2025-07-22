from typing import Type, Union
import httpx
from pydantic import BaseModel, ValidationError
from .models import SuccessResponse, ErrorResponse
import ssl


class ApiClient:
    def __init__(
        self,
        client: httpx.AsyncClient | None = None,
        verify_ssl: Union[str, bool] = True,
    ):
        self._client = client or httpx.AsyncClient(
            http2=True, follow_redirects=True, timeout=15.0, verify=verify_ssl
        )

    async def get[T: BaseModel](
        self, url: str, response_model: Type[T]
    ) -> Union[SuccessResponse[T], ErrorResponse]:
        """Performs a GET request and validates the response."""
        try:
            response = await self._client.get(url)
            response.raise_for_status()

            raw_data = response.json()
            if isinstance(raw_data, dict) and "data" in raw_data:
                payload_to_validate = raw_data["data"]
            else:
                payload_to_validate = raw_data

            validated_data = response_model.model_validate(payload_to_validate)

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
                # Provide the rich error details from Pydantic
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
