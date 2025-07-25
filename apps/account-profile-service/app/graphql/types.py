import strawberry
from typing import List

# This file is now much simpler. It only defines the types this service owns.


@strawberry.federation.type(keys=["id"])
class ProfileType:
    id: strawberry.ID
    name: str
    avatar: str | None
    manifest_urls: List[str]
