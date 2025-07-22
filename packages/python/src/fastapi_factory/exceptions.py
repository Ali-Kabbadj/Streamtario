from typing import Any
from fastapi import status


class ApiException(Exception):
    """Base exception for our API."""

    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    message: str = "An internal server error occurred."
    details: Any | None = None

    def __init__(
        self,
        message: str | None = None,
        status_code: int | None = None,
        details: Any | None = None,
    ):
        if message is not None:
            self.message = message
        if status_code is not None:
            self.status_code = status_code
        if details is not None:
            self.details = details
        super().__init__(self.message)


class NotFoundException(ApiException):
    status_code = status.HTTP_404_NOT_FOUND
    message = "Resource not found."


class ValidationException(ApiException):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    message = "Validation failed."
