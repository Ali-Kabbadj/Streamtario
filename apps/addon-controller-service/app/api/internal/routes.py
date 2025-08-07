from dependency_injector.wiring import inject, Provide
from fastapi import APIRouter, Depends
from api_contract.responses import ApiResponse
from core.pydantic.meta.meta import MetaItem
from ...containers import Container
from ...use_cases.find_and_get_meta import FindAndGetMetaUseCase

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
