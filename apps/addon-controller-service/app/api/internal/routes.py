from dependency_injector.wiring import inject, Provide
from fastapi import APIRouter, Depends, Query
from api_contract.responses import ApiResponse
from core.pydantic.meta.meta import MetaItem

from app.use_cases.get_person_details import GetPersonDetailsUseCase
from ...containers import Container
from ...use_cases.find_and_get_meta import FindAndGetMetaUseCase
from core.pydantic.meta.person import PersonDetails
from ...use_cases.get_person_details import GetPersonDetailsUseCase
from domain_exceptions.exceptions import ApiException
from api_contract.errors import ApiErrorCode

router = APIRouter()


@router.get(
    "/meta/{profile_id}/{item_type}/{item_id:path}",
    response_model=ApiResponse[MetaItem],
)
@inject
async def get_meta_for_item(
    profile_id: str,
    item_type: str,
    item_id: str,
    use_case: FindAndGetMetaUseCase = Depends(
        Provide[Container.find_and_get_meta_use_case]
    ),
):
    """
    Internal endpoint for resolving metadata for a specific item.
    Used by the account-profile-service to enrich playback history.
    The `:path` converter allows item_id to contain special characters like '/'.
    """
    meta = await use_case.execute(
        profile_id=profile_id, item_type=item_type, item_id=item_id
    )
    return ApiResponse[MetaItem](ok=True, data=meta, error=None)


@router.get(
    "/person-details",
    response_model=ApiResponse[PersonDetails],
    summary="Get Rich Details for a Person (Actor, Director, etc.)",
)
@inject
async def get_person_details(
    name: str = Query(..., description="The full name of the person to look up."),
    use_case: GetPersonDetailsUseCase = Depends(
        Provide[Container.get_person_details_use_case]
    ),
):
    details = await use_case.execute(person_name=name)
    if not details:
        raise ApiException(
            ApiErrorCode.PROFILE_NOT_FOUND,
            override_message=f"No details found for '{name}'.",
        )
    return ApiResponse[PersonDetails](ok=True, data=details, error=None)
