from os import error
from pydantic import Json
import strawberry
from typing import List, Optional
from core.pydantic.domain.account import Account as PydanticAccount
from core.pydantic.domain.profile import Profile as PydanticProfile
from core.pydantic.domain.addon import InstalledAddon as PydanticInstalledAddon
from strawberry.scalars import JSON

# ========= INPUT TYPES =========


@strawberry.input
class LoginInput:
    email: str
    password: str


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


@strawberry.input
class CreateProfileInput:
    name: str
    avatar: Optional[str] = None
    is_private: bool = False
    pin: Optional[str] = None


@strawberry.input
class UpdateProfileInput:
    profile_id: strawberry.ID
    name: Optional[str] = None
    avatar: Optional[str] = None
    is_private: Optional[bool] = None
    pin: Optional[str] = None


@strawberry.input
class InstallAddonForAllProfilesInput:
    manifest_url: str


@strawberry.input
class UninstallAddonFromAllProfilesInput:
    manifest_id: str


# ========= OBJECT TYPES =========


@strawberry.type
class InstalledAddonType:
    id: strawberry.ID
    manifest_url: str
    manifest_id: str
    installed_at: str

    @classmethod
    def from_pydantic(cls, model: PydanticInstalledAddon) -> "InstalledAddonType":
        return cls(
            id=strawberry.ID(model.id),
            manifest_url=model.manifest_url,
            manifest_id=model.manifest_id,
            installed_at=model.installed_at.isoformat(),
        )


@strawberry.federation.type(keys=["id"], name="Profile")
class ProfileType:
    id: strawberry.ID
    name: str
    avatar: Optional[str]
    is_private: bool
    installed_addons: List[InstalledAddonType]
    manifest_urls: List[str]

    @classmethod
    def from_pydantic(cls, model: PydanticProfile) -> "ProfileType":
        return cls(
            id=strawberry.ID(model.id),
            name=model.name or "profile has no name",
            avatar=model.avatar,
            is_private=model.is_private,
            installed_addons=[
                InstalledAddonType.from_pydantic(a) for a in model.installed_addons
            ],
            manifest_urls=model.manifest_urls,
        )


@strawberry.type
class AccountType:
    id: strawberry.ID
    email: str
    profiles: List[ProfileType]

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


@strawberry.type
class CreateProfileSuccess:
    profile: ProfileType


@strawberry.type
class CreateProfileError:
    message: str
    field: Optional[str] = None


@strawberry.type
class UpdateProfileSuccess:
    profile: ProfileType


@strawberry.type
class UpdateProfileError:
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


@strawberry.type
class LoginSuccess:
    account: AccountType


@strawberry.type
class LoginError:
    message: str


@strawberry.type
class InstallAddonForAllProfilesSuccess:
    summary: JSON  # type: ignore


@strawberry.type
class InstallAddonForAllProfilesError:
    message: str
    error: Optional[JSON]  # type: ignore


@strawberry.type
class UninstallAddonFromAllProfilesSuccess:
    summary: JSON  # type: ignore


@strawberry.type
class UninstallAddonFromAllProfilesError:
    message: str
