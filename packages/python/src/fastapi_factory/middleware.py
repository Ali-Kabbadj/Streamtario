import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response
from core.utils.logging import log_http


class HttpLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        """
        Intercepts all requests to log key metadata including processing time.
        """
        start_time = time.time()

        try:
            response = await call_next(request)
        except Exception as e:
            process_time = (time.time() - start_time) * 1000
            log_http(
                f"Request failed: {request.method} {request.url.path} - 500 Internal Server Error",
                data={
                    "method": request.method,
                    "path": request.url.path,
                    "client": request.client.host,
                    "processing_time_ms": round(process_time, 2),
                    "error": str(e),
                },
                context="http_error",
            )
            raise e

        process_time = (time.time() - start_time) * 1000

        log_http(
            f"Request: {request.method} {request.url.path} - {response.status_code}",
            data={
                "method": request.method,
                "path": request.url.path,
                "client": request.client.host,
                "status_code": response.status_code,
                "processing_time_ms": round(process_time, 2),
            },
        )

        return response
