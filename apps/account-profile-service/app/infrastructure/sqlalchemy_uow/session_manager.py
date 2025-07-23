from abc import ABC, abstractmethod
from types import TracebackType
from typing import Optional, Type
from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession
from app.domain.interfaces.i_unit_of_work import IUnitOfWork
from app.repositories.account_repository import AccountRepository
from app.repositories.profile_repository import ProfileRepository


class SqlAlchemyUnitOfWork(IUnitOfWork):
    """Implements the Unit of Work pattern using SQLAlchemy sessions."""

    def __init__(self, session_factory: async_sessionmaker[AsyncSession]):
        self.session_factory = session_factory

    async def __aenter__(self):
        self.session: AsyncSession = self.session_factory()
        self.accounts = AccountRepository(self.session)
        self.profiles = ProfileRepository(self.session)
        return self

    async def __aexit__(
        self,
        exc_type: Optional[Type[BaseException]],
        exc_val: Optional[BaseException],
        exc_tb: Optional[TracebackType],
    ):
        if exc_type is not None:
            await self.rollback()
        else:
            await self.commit()
        await self.session.close()

    async def commit(self):
        await self.session.commit()

    async def rollback(self):
        await self.session.rollback()
