from fastapi import APIRouter, Depends, Body
from dependency_injector.wiring import inject, Provide
from pydantic import BaseModel

from app.containers import Container
from api_contract.responses import ApiResponse
from security.schemas import TokenResponse, TokenPayload
from security.jwt_service import IJwtService
from domain_exceptions.exceptions import ApiException

router = APIRouter(tags=["Authentication"])


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/refresh", response_model=ApiResponse[TokenResponse])
@inject
def refresh_access_token(
    request: RefreshRequest = Body(...),
    jwt_service: IJwtService = Depends(Provide[Container.jwt_service]),
):
    """
    Issues a new access token using a valid refresh token.
    """
    token_payload = jwt_service.decode_token(request.refresh_token)
    new_access_token = jwt_service.create_access_token(data=token_payload.model_dump())
    new_token_response = TokenResponse(
        accessToken=new_access_token,
        refreshToken=request.refresh_token,
        tokenType="bearer",
    )

    return ApiResponse[TokenResponse](ok=True, data=new_token_response, error=None)
