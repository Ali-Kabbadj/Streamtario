from typing import Any
from api_contract.errors import ApiErrorCode


class ApiException(Exception):
    """
    The single, standard exception for all known API errors.
    It is always initialized with a structured error from the ApiErrorCode enum.
    """

    status_code: int
    code: str
    message: str
    ui_message: str
    details: Any | None

    def __init__(
        self,
        error_code: ApiErrorCode,
        details: Any | None = None,
        override_message: str | None = None,
    ):
        error_detail = error_code.value

        self.status_code = error_detail.status_code
        self.message = override_message or error_detail.dev_message
        self.ui_message = error_detail.ui_message
        self.code = error_code.name
        self.details = details
        super().__init__(f"[{self.code}]: {self.message}")
