from typing import Callable
from core.pydantic.domain.account import Account
from domain_exceptions.exceptions import NotFoundException

from app.domain.interfaces.i_unit_of_work import IUnitOfWork


class GetAccountUseCase:
    def __init__(self, uow_factory: Callable[[], IUnitOfWork]):
        self.uow_factory = uow_factory

    async def execute(self, account_id: str) -> Account:
        async with self.uow_factory() as uow:
            account = await uow.accounts.get_by_id(account_id)

        if not account:
            raise NotFoundException(entity_name="Account", identifier=account_id)

        return account
