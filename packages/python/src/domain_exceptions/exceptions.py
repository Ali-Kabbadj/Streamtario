from typing import Any
from fastapi import status


class ApiException(Exception):
    """Base exception for our API."""

    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    message: str = "An internal server error occurred."
    ui_message: str = "An unexpected error occurred. Please try again later."
    details: Any | None = None

    def __init__(
        self,
        message: str | None = None,
        status_code: int | None = None,
        details: Any | None = None,
        ui_message: str | None = None,  # Added ui_message
    ):
        if message is not None:
            self.message = message
        if status_code is not None:
            self.status_code = status_code
        if details is not None:
            self.details = details
        if ui_message is not None:
            self.ui_message = ui_message
        super().__init__(self.message)


class NotFoundException(ApiException):
    def __init__(self, entity_name: str, identifier: Any):
        message = f"{entity_name} with ID '{identifier}' not found."
        ui_message = f"The requested {entity_name.lower()} could not be found."
        details = {"entity": entity_name, "identifier": identifier}
        super().__init__(
            message=message,
            ui_message=ui_message,
            status_code=status.HTTP_404_NOT_FOUND,
            details=details,
        )


class ValidationException(ApiException):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    message = "Validation failed."
    ui_message = "The information you provided is invalid. Please check and try again."


class ConflictException(ApiException):
    def __init__(self, entity_name: str, identifier: Any, details: dict | None = None):
        message = f"A {entity_name.lower()} with the identifier '{identifier}' already exists."
        ui_message = f"This {entity_name.lower()} already exists."
        base_details = {"entity": entity_name, "identifier": identifier}
        if details:
            base_details.update(details)
        super().__init__(
            message=message,
            ui_message=ui_message,
            status_code=status.HTTP_409_CONFLICT,
            details=base_details,
        )


class AddonProviderException(ApiException):
    def __init__(self, looking_for: str, attempted_lookups: dict):
        message = f"Could not find an installed addon to provide the requested resource: {looking_for}"
        ui_message = "Could not find a provider for the requested content."
        details = {
            "error_type": "ProviderNotFound",
            "resource_required": looking_for,
            "debug_info": attempted_lookups,
        }
        super().__init__(
            message=message,
            ui_message=ui_message,
            status_code=status.HTTP_404_NOT_FOUND,
            details=details,
        )


class ValidatorRuleException(ValidationException):
    """A structured exception for a specific validation rule failure."""

    def __init__(self, field_name: str, invalid_value: Any, reason: str):
        try:
            serializable_value = str(invalid_value)
        except Exception:
            serializable_value = "Unserializable Value"

        message = f"Validation failed for field '{field_name}': {reason}"
        ui_message = f"The value for '{field_name}' is invalid. {reason}"
        details = {
            "field": field_name,
            "invalid_value": serializable_value,
            "reason": reason,
        }
        # The parent ValidationException sets the status code
        super().__init__(message=message, ui_message=ui_message, details=details)
