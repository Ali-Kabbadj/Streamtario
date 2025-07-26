# /apps/account-profile-service/app/graphql/types.py

import strawberry
from typing import List, Optional
from core.pydantic.domain.account import Account as PydanticAccount
from core.pydantic.domain.profile import Profile as PydanticProfile
from core.pydantic.domain.addon import InstalledAddon as PydanticInstalledAddon

# ========= INPUT TYPES =========


@strawberry.input
class CreateAccountInput:
    email: str
    password: str


@strawberry.input
class InstallAddonInput:
    profile_id: strawberry.ID
    manifest_url: str


@strawberry.input
class UninstallAddonInput:
    profile_id: strawberry.ID
    manifest_id: str


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
            name=model.name or "profile has no name",
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


@strawberry.type
class InstalledAddonType:
    id: strawberry.ID
    manifest_url: str
    manifest_id: str
    installed_at: str  # Using str for GraphQL compatibility with datetime

    @classmethod
    def from_pydantic(cls, model: PydanticInstalledAddon) -> "InstalledAddonType":
        return cls(
            id=strawberry.ID(model.id),
            manifest_url=model.manifest_url,
            manifest_id=model.manifest_id,
            installed_at=model.installed_at.isoformat(),
        )


# ========= MUTATION PAYLOADS =========


@strawberry.type
class CreateAccountSuccess:
    account: AccountType


@strawberry.type
class CreateAccountError:
    message: str
    field: Optional[str] = None


@strawberry.type
class InstallAddonSuccess:
    addon: InstalledAddonType


@strawberry.type
class InstallAddonError:
    message: str
    profile_id: strawberry.ID


@strawberry.type
class UninstallAddonSuccess:
    success: bool
    profile_id: strawberry.ID
    manifest_id: str


@strawberry.type
class UninstallAddonError:
    message: str
    profile_id: strawberry.ID
    manifest_id: str
