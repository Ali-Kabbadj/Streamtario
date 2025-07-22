from typing import Type, Union
import httpx
from pydantic import BaseModel, ValidationError
from .models import SuccessResponse, ErrorResponse
import ssl
import asyncio


class ApiClient:

    def __init__(
        self,
        client: httpx.AsyncClient | None = None,
        verify_ssl: Union[str, bool] = True,
        retries: int = 2,
    ):
        self.retries = retries
        self._client = client or httpx.AsyncClient(
            http2=True, follow_redirects=True, timeout=15.0, verify=verify_ssl
        )

    async def get[T: BaseModel](
        self, url: str, response_model: Type[T]
    ) -> Union[SuccessResponse[T], ErrorResponse]:
        """Performs a GET request and validates the response, with retries."""
        last_exception = None
        for attempt in range(self.retries):
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

            except (httpx.HTTPStatusError, httpx.RequestError) as e:
                # Retry on 5xx errors and network errors
                if (
                    isinstance(e, httpx.HTTPStatusError)
                    and e.response.status_code < 500
                ):
                    return ErrorResponse(
                        status_code=e.response.status_code,
                        error_message=f"HTTP Error: {e.response.status_code}",
                        details=str(e),
                    )

                last_exception = e
                await asyncio.sleep(0.5 * (attempt + 1))  # Exponential backoff
                continue

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

        return ErrorResponse(
            status_code=503,
            error_message="Service Unavailable after multiple retries",
            details=str(last_exception),
        )

    async def post[T: BaseModel](
        self, url: str, json: dict, response_model: Type[T]
    ) -> Union[SuccessResponse[T], ErrorResponse]:
        """Performs a POST request and validates the response."""
        try:
            response = await self._client.post(url, json=json)
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
