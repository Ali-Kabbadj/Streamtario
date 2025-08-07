import httpx
import json
import asyncio
from typing import Type, Union, Optional, Dict, Any
from pydantic import BaseModel, ValidationError, TypeAdapter
from api_contract.responses import ApiResponse, ErrorDetail


class ApiClient:
    def __init__(
        self,
        client: httpx.AsyncClient | None = None,
        verify_ssl: Union[str, bool] = True,
        retries: int = 2,
    ):
        self.retries = retries
        self._client_args = {
            "http2": True,
            "follow_redirects": True,
            "timeout": 15.0,
            "verify": verify_ssl,
        }
        self._client = client

    async def _get_client(self) -> httpx.AsyncClient:
        if not self._client or self._client.is_closed:
            self._client = httpx.AsyncClient(**self._client_args)
        return self._client

    async def get[T: BaseModel](
        self, url: str, response_model: Type[T], params: Optional[Dict[str, Any]] = None
    ) -> ApiResponse[T]:
        client = await self._get_client()
        last_exception = None
        for attempt in range(self.retries):
            try:
                # THE FIX: Pass params to the get request
                response = await client.get(url, params=params)
                response.raise_for_status()
                api_response = TypeAdapter(ApiResponse[response_model]).validate_json(
                    response.content
                )
                return api_response

            except httpx.HTTPStatusError as e:
                # ... (error handling is unchanged)
                try:
                    error_body = e.response.json()
                except json.JSONDecodeError:
                    error_body = e.response.text

                error_detail = ErrorDetail(
                    type="HttpError",
                    dev_message=f"Downstream service at {e.request.url} returned status {e.response.status_code}.",
                    ui_message="A required downstream service is failing.",
                    details={
                        "downstream_url": str(e.request.url),
                        "status_code": e.response.status_code,
                        "response_body": error_body,
                    },
                )
                return ApiResponse[T](ok=False, data=None, error=error_detail)

            except httpx.RequestError as e:
                last_exception = e
                await asyncio.sleep(0.5 * (attempt + 1))
                continue

            except ValidationError as e:
                error_detail = ErrorDetail(
                    type="ApiResponseValidationError",
                    dev_message="The response from a downstream service was not a valid ApiResponse envelope.",
                    ui_message="Received an invalid response from a downstream service.",
                    details={
                        "downstream_url": url,
                        "validation_errors": e.errors(),
                    },
                )
                return ApiResponse[T](ok=False, data=None, error=error_detail)

            except Exception as e:
                error_detail = ErrorDetail(
                    type="UnexpectedClientError",
                    dev_message=str(e),
                    ui_message="An unexpected error occurred.",
                    details={"exception_type": e.__class__.__name__},
                )
                return ApiResponse[T](ok=False, data=None, error=error_detail)

        error_detail = ErrorDetail(
            type="ServiceUnavailable",
            dev_message=f"Could not connect to {url} after {self.retries} attempts.",
            ui_message="A required downstream service is unavailable.",
            details={"last_exception": str(last_exception)},
        )
        return ApiResponse[T](ok=False, data=None, error=error_detail)

    async def post[T: BaseModel](
        self, url: str, json_payload: dict, response_model: Type[T]
    ) -> ApiResponse[T]:
        client = await self._get_client()
        try:
            response = await client.post(url, json=json_payload)
            response.raise_for_status()
            api_response = TypeAdapter(ApiResponse[response_model]).validate_json(
                response.content
            )
            return api_response
        except httpx.HTTPStatusError as e:
            try:
                error_body = e.response.json()
            except json.JSONDecodeError:
                error_body = e.response.text
            error_detail = ErrorDetail(
                type="HttpError",
                dev_message=f"Downstream service at {e.request.url} returned status {e.response.status_code}.",
                ui_message="A downstream service failed.",
                details={
                    "downstream_url": str(e.request.url),
                    "status_code": e.response.status_code,
                    "request_body": json_payload,
                    "response_body": error_body,
                },
            )
            return ApiResponse[T](ok=False, data=None, error=error_detail)
        except httpx.RequestError as e:
            error_detail = ErrorDetail(
                type="ServiceUnavailable",
                dev_message=str(e),
                ui_message="A downstream service is unavailable.",
                details={"downstream_url": url},
            )
            return ApiResponse[T](ok=False, data=None, error=error_detail)
        except ValidationError as e:
            error_detail = ErrorDetail(
                type="ApiResponseValidationError",
                dev_message="The response from a downstream service was not a valid ApiResponse envelope.",
                ui_message="Received an invalid response from a downstream service.",
                details={
                    "downstream_url": url,
                    "validation_errors": e.errors(),
                },
            )
            return ApiResponse[T](ok=False, data=None, error=error_detail)
        except Exception as e:
            error_detail = ErrorDetail(
                type="UnexpectedClientError",
                dev_message=str(e),
                ui_message="An unexpected error occurred.",
                details={"exception_type": e.__class__.__name__},
            )
            return ApiResponse[T](ok=False, data=None, error=error_detail)

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()
