import strawberry
from typing import List, Optional
from core.pydantic.domain.account import Account as PydanticAccount
from core.pydantic.domain.profile import Profile as PydanticProfile

# ========= INPUT TYPES =========


@strawberry.input
class CreateAccountInput:
    email: str
    password: str


# ========= OBJECT TYPES =========


@strawberry.federation.type(keys=["id"], name="Profile")
class ProfileType:
    id: strawberry.ID
    name: str
    avatar: Optional[str]
    manifest_urls: List[str]

    # This is a 'factory' method to create a Strawberry type from a Pydantic model
    @classmethod
    def from_pydantic(cls, model: PydanticProfile) -> "ProfileType":
        return cls(
            id=strawberry.ID(model.id),
            name=model.name,
            avatar=model.avatar,
            manifest_urls=model.manifest_urls,
        )


@strawberry.type
class AccountType:
    id: strawberry.ID
    email: str
    profiles: List[ProfileType]

    # Factory method to create this type from the Pydantic Account model
    @classmethod
    def from_pydantic(cls, model: PydanticAccount) -> "AccountType":
        return cls(
            id=strawberry.ID(model.id),
            email=model.email,
            profiles=[ProfileType.from_pydantic(p) for p in model.profiles],
        )


# ========= MUTATION PAYLOADS =========


@strawberry.type
class CreateAccountSuccess:
    account: AccountType


@strawberry.type
class CreateAccountError:
    message: str
    field: Optional[str] = None
