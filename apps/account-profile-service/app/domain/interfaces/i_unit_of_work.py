from abc import ABC, abstractmethod
from types import TracebackType
from typing import Optional, Self, Type
from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession
from app.domain.repositories.i_account_repository import IAccountRepository
from app.domain.repositories.i_profile_repository import IProfileRepository
from app.repositories.account_repository import AccountRepository
from app.repositories.profile_repository import ProfileRepository


class IUnitOfWork(ABC):
    """Defines the interface for a Unit of Work."""

    accounts: IAccountRepository
    profiles: IProfileRepository

    @abstractmethod
    async def __aenter__(self) -> Self: ...

    @abstractmethod
    async def __aexit__(
        self,
        exc_type: Optional[Type[BaseException]],
        exc_val: Optional[BaseException],
        exc_tb: Optional[TracebackType],
    ): ...

    @abstractmethod
    async def commit(self): ...

    @abstractmethod
    async def rollback(self): ...
