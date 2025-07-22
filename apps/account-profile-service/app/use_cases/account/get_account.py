from typing import Optional
from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession
from core.pydantic.domain.account import Account
from app.domain.interfaces.i_unit_of_work import IUnitOfWork
from typing import Optional, Callable, Awaitable


class GetAccountUseCase:
    def __init__(self, uow_factory: Callable[[], IUnitOfWork]):
        self.uow_factory = uow_factory

    async def execute(self, account_id: str) -> Optional[Account]:
        async with self.uow_factory() as uow:
            return await uow.accounts.get_by_id(account_id)
