from dependency_injector.wiring import inject, Provide
from fastapi import APIRouter, Depends, Body
from fastapi_factory.responses import create_success_response, SuccessResponse
from fastapi_factory.exceptions import NotFoundException

from ...containers import Container
from ...services.services import IAccountService
from core.pydantic.auth.user.account import Account

from pydantic import BaseModel, Field


class CreateAccountRequest(BaseModel):
    email: str
    password: str


router = APIRouter()


@router.post("/accounts", response_model=SuccessResponse[Account], status_code=201)
@inject
async def create_new_account(
    request: CreateAccountRequest = Body(...),
    account_service: IAccountService = Depends(Provide[Container.account_service]),
):
    """Creates a new user account."""
    account = await account_service.create_account(
        email=request.email, password=request.password
    )
    return create_success_response(data=account, status_code=201)


@router.get("/accounts/{account_id}", response_model=SuccessResponse[Account])
@inject
async def get_account_by_id(
    account_id: str,
    account_service: IAccountService = Depends(Provide[Container.account_service]),
):
    """Retrieves a user account by its ID."""
    account = await account_service.get_account_by_id(account_id)
    if not account:
        raise NotFoundException(details={"account_id": account_id})
    return create_success_response(data=account)
