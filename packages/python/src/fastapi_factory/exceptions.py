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
    """
    An exception raised when a specific resource is not found.
    It automatically generates a descriptive message.
    """

    def __init__(self, entity_name: str, identifier: Any):
        message = f"{entity_name} with ID '{identifier}' not found."
        details = {
            "entity": entity_name,
            "identifier": identifier,
            "reason": f"The provided identifier does not match any existing {entity_name.lower()}.",
        }
        # Call the parent constructor with the generated message and details
        super().__init__(
            message=message, status_code=status.HTTP_404_NOT_FOUND, details=details
        )


class ValidationException(ApiException):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    message = "Validation failed."


class ConflictException(ApiException):
    """
    An exception raised when an action cannot be completed because the
    resource already exists. (HTTP 409)
    """

    def __init__(self, entity_name: str, identifier: Any, details: dict | None = None):
        message = f"A {entity_name.lower()} with the identifier '{identifier}' already exists."
        base_details = {"entity": entity_name, "identifier": identifier}
        if details:
            base_details.update(details)

        super().__init__(
            message=message, status_code=status.HTTP_409_CONFLICT, details=base_details
        )


class AddonProviderException(ApiException):
    """
    A specific exception for when a suitable addon provider cannot be found
    for a given task (e.g., providing metadata for a specific ID prefix).
    """

    def __init__(self, looking_for: str, attempted_lookups: dict):
        message = f"Could not find an installed addon to provide the requested resource: {looking_for}"
        details = {
            "error_type": "ProviderNotFound",
            "resource_required": looking_for,
            "debug_info": attempted_lookups,
        }
        super().__init__(
            message=message, status_code=status.HTTP_404_NOT_FOUND, details=details
        )
