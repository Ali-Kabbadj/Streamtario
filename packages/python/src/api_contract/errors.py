from enum import Enum
from collections import namedtuple
from fastapi import status

ErrorCodeDetail = namedtuple(
    "ErrorCodeDetail", ["status_code", "dev_message", "ui_message"]
)


class ApiErrorCode(Enum):
    """
    The single source of truth for all API errors.
    Each enum member is a tuple containing:
    (HTTP Status Code, Developer-facing Message, UI-facing Message)
    """

    UNEXPECTED_ERROR = ErrorCodeDetail(
        status.HTTP_500_INTERNAL_SERVER_ERROR,
        "An unexpected and unhandled error occurred.",
        "An unexpected server error occurred. Please try again later.",
    )
    SERVICE_UNAVAILABLE = ErrorCodeDetail(
        status.HTTP_503_SERVICE_UNAVAILABLE,
        "A required downstream service was unavailable.",
        "A required service is temporarily unavailable. Please try again later.",
    )
    AUTHENTICATION_REQUIRED = ErrorCodeDetail(
        status.HTTP_401_UNAUTHORIZED,
        "Request is missing a valid bearer token.",
        "Authentication is required to perform this action.",
    )
    FORBIDDEN = ErrorCodeDetail(
        status.HTTP_403_FORBIDDEN,
        "The authenticated user does not have permission to perform this action.",
        "You are not authorized to perform this action.",
    )
    INVALID_CREDENTIALS = ErrorCodeDetail(
        status.HTTP_401_UNAUTHORIZED,
        "The email or password provided did not match our records.",
        "The email or password you entered is incorrect.",
    )
    INVALID_PROFILE_CREDENTIALS = ErrorCodeDetail(
        status.HTTP_401_UNAUTHORIZED,
        "The Pin you provided for this profile does is not correct.",
        "The Pin is not correct, try again.",
    )
    GOOGLE_LOGIN_FAILED = ErrorCodeDetail(
        status.HTTP_401_UNAUTHORIZED,
        "The Google ID token could not be verified.",
        "Google authentication failed. Please try again.",
    )
    ACCOUNT_NOT_FOUND = ErrorCodeDetail(
        status.HTTP_404_NOT_FOUND,
        "The requested account could not be found.",
        "The requested account could not be found.",
    )
    PROFILE_NOT_FOUND = ErrorCodeDetail(
        status.HTTP_404_NOT_FOUND,
        "The requested profile could not be found.",
        "The requested profile could not be found.",
    )
    ADDON_NOT_FOUND = ErrorCodeDetail(
        status.HTTP_404_NOT_FOUND,
        "The requested addon could not be found for the given profile.",
        "The requested addon could not be found.",
    )
    ACCOUNT_EMAIL_EXISTS = ErrorCodeDetail(
        status.HTTP_409_CONFLICT,
        "An account with the provided email address already exists.",
        "An account with this email address already exists.",
    )
    ACCOUNT_EMAIL_IN_USE_BY_SOCIAL = ErrorCodeDetail(
        status.HTTP_409_CONFLICT,
        "An account with this email is already registered, but with a password.",
        "This email is registered with a password. Please sign in with your password instead.",
    )
    ADDON_ALREADY_INSTALLED = ErrorCodeDetail(
        status.HTTP_409_CONFLICT,
        "The addon is already installed on the target profile.",
        "This addon is already installed on this profile.",
    )
    ACCOUNT_PROFILE_LIMIT_REACHED = ErrorCodeDetail(
        status.HTTP_409_CONFLICT,
        "The account has reached the maximum number of profiles allowed.",
        "You have reached the maximum number of profiles for this account.",
    )
    VALIDATION_ERROR = ErrorCodeDetail(
        status.HTTP_422_UNPROCESSABLE_ENTITY,
        "Input validation failed.",
        "The information you provided is invalid. Please check and try again.",
    )
    VALIDATION_PIN_REQUIRED = ErrorCodeDetail(
        status.HTTP_422_UNPROCESSABLE_ENTITY,
        "A 4-digit PIN is required for a private profile.",
        "A 4-digit PIN is required to make a profile private.",
    )
    VALIDATION_PASSWORD_STRENGTH = ErrorCodeDetail(
        status.HTTP_422_UNPROCESSABLE_ENTITY,
        "The provided password does not meet the strength requirements.",
        "Password must be at least 8 characters and include uppercase, lowercase, and numbers.",
    )
    VALIDATION_MANIFEST_URL_INVALID = ErrorCodeDetail(
        status.HTTP_422_UNPROCESSABLE_ENTITY,
        "The manifest URL is invalid or could not be reached.",
        "The provided addon URL is invalid or could not be reached.",
    )
