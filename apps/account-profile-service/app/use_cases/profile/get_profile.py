from typing import Callable
from core.pydantic.domain.profile import Profile
from domain_exceptions.exceptions import NotFoundException
from app.domain.interfaces.i_unit_of_work import IUnitOfWork


class GetProfileUseCase:
    """Use case to fetch a single profile by its ID."""

    def __init__(self, uow_factory: Callable[[], IUnitOfWork]):
        self.uow_factory = uow_factory

    async def execute(self, profile_id: str) -> Profile:
        async with self.uow_factory() as uow:
            profile = await uow.profiles.get_by_id(profile_id)

        if not profile:
            raise NotFoundException(entity_name="Profile", identifier=profile_id)

        return profile
