from fastapi import Depends, Request
from dependency_injector.wiring import inject, Provide

from app.containers import Container
from security.jwt_service import IJwtService
from security.schemas import TokenPayload
from domain_exceptions.exceptions import ApiException
from api_contract.errors import ApiErrorCode


@inject
def get_current_user_payload(
    request: Request,
    jwt_service: IJwtService = Depends(Provide[Container.jwt_service]),
) -> TokenPayload:
    """
    A FastAPI dependency that extracts, validates, and decodes the JWT
    from the Authorization header, returning the token payload.

    Raises an ApiException(AUTHENTICATION_REQUIRED) if the token is missing or invalid.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise ApiException(error_code=ApiErrorCode.AUTHENTICATION_REQUIRED)

    try:
        scheme, token = auth_header.split()
        if scheme.lower() != "bearer":
            raise ApiException(error_code=ApiErrorCode.AUTHENTICATION_REQUIRED)
    except ValueError:
        raise ApiException(error_code=ApiErrorCode.AUTHENTICATION_REQUIRED)
    return jwt_service.decode_token(token)
