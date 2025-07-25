import strawberry
from typing import List


@strawberry.federation.type(keys=["id"], name="Profile")
class ProfileType:
    id: strawberry.ID
    name: str
    avatar: str | None
    manifest_urls: List[str]
