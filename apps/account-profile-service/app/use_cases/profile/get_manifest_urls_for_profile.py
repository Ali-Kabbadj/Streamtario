from typing import Callable, List
from app.domain.interfaces.i_unit_of_work import IUnitOfWork
from domain_exceptions.exceptions import ApiException
from api_contract.errors import ApiErrorCode


class GetManifestUrlsForProfileUseCase:
    def __init__(self, uow_factory: Callable[[], IUnitOfWork]):
        self.uow_factory = uow_factory

    async def execute(self, profile_id: str) -> List[str]:
        async with self.uow_factory() as uow:
            profile = await uow.profiles.get_by_id(profile_id)

        if not profile:
            raise ApiException(
                ApiErrorCode.PROFILE_NOT_FOUND, details={"profile_id": profile_id}
            )

        return profile.manifest_urls
