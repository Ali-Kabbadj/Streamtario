from os import error
from pydantic import Json
import strawberry
from typing import List, Optional
from strawberry.types import Info
from core.pydantic.domain.account import Account as PydanticAccount
from core.pydantic.domain.profile import Profile as PydanticProfile
from core.pydantic.domain.addon import InstalledAddon as PydanticInstalledAddon
from strawberry.scalars import JSON
from core.pydantic.domain.profile import PlaybackHistory as PydanticPlaybackHistory


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
class UpdateProfileSettingsInput:
    profile_id: strawberry.ID
    settings: JSON  # type: ignore


@strawberry.input
class InstallAddonForAllProfilesInput:
    manifest_url: str


@strawberry.input
class UninstallAddonFromAllProfilesInput:
    manifest_id: str


@strawberry.input
class VerifyProfilePinInput:
    profile_id: strawberry.ID
    pin: str


@strawberry.input
class UpdatePlaybackHistoryInput:
    profile_id: strawberry.ID
    content_id: str
    imdb_id: str
    item_type: str
    position_seconds: int
    duration_seconds: int
    last_stream_details: Optional[JSON] = None  # type: ignore


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


@strawberry.federation.type(keys=["id"])
class PlaybackHistoryType:
    id: strawberry.ID
    profile_id: strawberry.ID = strawberry.field(name="profileId")
    content_id: str
    item_type: str
    # imdb_id: Optional[str] = None
    imdb_id: str
    season: Optional[int] = None
    episode: Optional[int] = None
    position_seconds: int
    duration_seconds: int
    watched_at: str
    last_stream_details: Optional[JSON] = None  # type: ignore

    @classmethod
    def from_pydantic(cls, model: PydanticPlaybackHistory) -> "PlaybackHistoryType":
        return cls(
            id=strawberry.ID(model.id),
            profile_id=strawberry.ID(model.profile_id),
            content_id=model.content_id,
            item_type=model.item_type,
            imdb_id=model.imdb_id,
            season=model.season,
            episode=model.episode,
            position_seconds=model.position_seconds,
            duration_seconds=model.duration_seconds,
            watched_at=model.watched_at.isoformat(),
            last_stream_details=model.last_stream_details,
        )


@strawberry.federation.type(keys=["id"], name="Profile")
class ProfileType:
    id: strawberry.ID
    name: str
    avatar: Optional[str]
    is_private: bool
    settings: JSON  # type: ignore
    installed_addons: List[InstalledAddonType]
    manifest_urls: List[str]

    @strawberry.field
    async def continue_watching(self, info: Info) -> List[PlaybackHistoryType]:
        from .resolvers import resolve_continue_watching

        return await resolve_continue_watching(info, self.id)

    @classmethod
    def from_pydantic(cls, model: PydanticProfile) -> "ProfileType":
        return cls(
            id=strawberry.ID(model.id),
            name=model.name or "profile has no name",
            avatar=model.avatar,
            is_private=model.is_private,
            settings=model.settings,
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
# (All mutation payloads are correct and unchanged)
@strawberry.type
class CreateAccountSuccess:
    account: AccountType


@strawberry.type
class CreateAccountError:
    code: str
    message: str
    field: Optional[str] = None


@strawberry.type
class CreateProfileSuccess:
    profile: ProfileType


@strawberry.type
class CreateProfileError:
    code: str
    message: str
    field: Optional[str] = None


@strawberry.type
class UpdateProfileSuccess:
    profile: ProfileType


@strawberry.type
class UpdateProfileError:
    code: str
    message: str
    field: Optional[str] = None


@strawberry.type
class UpdateProfileSettingsSuccess:
    profile: ProfileType


@strawberry.type
class UpdateProfileSettingsError:
    code: str
    message: str


@strawberry.type
class InstallAddonSuccess:
    addon: InstalledAddonType


@strawberry.type
class InstallAddonError:
    code: str
    message: str
    profile_id: strawberry.ID


@strawberry.type
class UninstallAddonSuccess:
    success: bool
    profile_id: strawberry.ID
    manifest_id: str


@strawberry.type
class UninstallAddonError:
    code: str
    message: str
    profile_id: strawberry.ID
    manifest_id: str


@strawberry.type
class LoginSuccess:
    account: AccountType


@strawberry.type
class LoginError:
    code: str
    message: str


@strawberry.type
class InstallAddonForAllProfilesSuccess:
    summary: JSON  # type: ignore


@strawberry.type
class InstallAddonForAllProfilesError:
    code: str
    message: str
    error: Optional[JSON]  # type: ignore


@strawberry.type
class UninstallAddonFromAllProfilesSuccess:
    summary: JSON  # type: ignore


@strawberry.type
class UninstallAddonFromAllProfilesError:
    code: str
    message: str


@strawberry.type
class VerifyProfilePinSuccess:
    success: bool


@strawberry.type
class VerifyProfilePinError:
    code: str
    message: str
