from dependency_injector.wiring import inject, Provide
from app.containers import Container
from app.use_cases.profile.get_profile import GetProfileUseCase
from .types import ProfileType
import strawberry


@inject
async def resolve_profile(
    id: strawberry.ID,
    use_case: GetProfileUseCase = Provide[Container.get_profile_use_case],
) -> ProfileType | None:
    # The use case returns a Pydantic domain model.
    pydantic_profile = await use_case.execute(profile_id=str(id))

    if not pydantic_profile:
        return None

    # We map the Pydantic model to the Strawberry GraphQL type.
    # This is the boundary between your internal domain and your public API.
    return ProfileType(
        id=strawberry.ID(pydantic_profile.id),
        name=pydantic_profile.name,
        avatar=pydantic_profile.avatar,
        manifest_urls=pydantic_profile.manifest_urls,
    )
