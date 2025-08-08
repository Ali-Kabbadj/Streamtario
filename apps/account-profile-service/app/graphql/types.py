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
from core.pydantic.domain.profile_settings import (
    ProfileSettings as PydanticProfileSettings,
    AudioSettings as PydanticAudioSettings,
    MpvSettings as PydanticMpvSettings,
    MpvCommand as PydanticMpvCommand,
)


@strawberry.input
class MpvCommandInput:
    name: str
    command: str


@strawberry.input
class MpvSettingsInput:
    custom_commands: Optional[List[MpvCommandInput]] = strawberry.field(
        default=strawberry.UNSET, name="customCommands"
    )


@strawberry.input
class AudioSettingsInput:
    preferred_channel_layout: Optional[str] = strawberry.field(
        default=strawberry.UNSET, name="preferredChannelLayout"
    )


@strawberry.input
class ProfileSettingsInput:
    cache_size_gb: Optional[int] = strawberry.field(
        default=strawberry.UNSET, name="cacheSizeGb"
    )
    preferred_audio_language: Optional[str] = strawberry.field(
        default=strawberry.UNSET, name="preferredAudioLanguage"
    )
    preferred_subtitle_language: Optional[str] = strawberry.field(
        default=strawberry.UNSET, name="preferredSubtitleLanguage"
    )
    stream_without_cache: Optional[bool] = strawberry.field(
        default=strawberry.UNSET, name="streamWithoutCache"
    )
    audio: Optional[AudioSettingsInput] = strawberry.field(default=strawberry.UNSET)
    mpv: Optional[MpvSettingsInput] = strawberry.field(default=strawberry.UNSET)


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
    settings: ProfileSettingsInput


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


@strawberry.type
class MpvCommandType:
    name: str
    command: str

    @classmethod
    def from_pydantic(cls, model: PydanticMpvCommand) -> "MpvCommandType":
        return cls(name=model.name, command=model.command)


@strawberry.type
class MpvSettingsType:
    custom_commands: List[MpvCommandType] = strawberry.field(name="customCommands")

    @classmethod
    def from_pydantic(cls, model: PydanticMpvSettings) -> "MpvSettingsType":
        return cls(
            custom_commands=[
                MpvCommandType.from_pydantic(c) for c in model.custom_commands
            ]
        )


@strawberry.type
class AudioSettingsType:
    preferred_channel_layout: str = strawberry.field(name="preferredChannelLayout")

    @classmethod
    def from_pydantic(cls, model: PydanticAudioSettings) -> "AudioSettingsType":
        return cls(preferred_channel_layout=model.preferred_channel_layout)


@strawberry.type
class ProfileSettingsType:
    cache_size_gb: int = strawberry.field(name="cacheSizeGb")
    preferred_audio_language: str = strawberry.field(name="preferredAudioLanguage")
    preferred_subtitle_language: str = strawberry.field(
        name="preferredSubtitleLanguage"
    )
    stream_without_cache: bool = strawberry.field(name="streamWithoutCache")
    audio: AudioSettingsType
    mpv: MpvSettingsType

    @classmethod
    def from_pydantic(cls, model: PydanticProfileSettings) -> "ProfileSettingsType":
        return cls(
            cache_size_gb=model.cache_size_gb,
            preferred_audio_language=model.preferred_audio_language,
            preferred_subtitle_language=model.preferred_subtitle_language,
            stream_without_cache=model.stream_without_cache,
            audio=AudioSettingsType.from_pydantic(model.audio),
            mpv=MpvSettingsType.from_pydantic(model.mpv),
        )


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
    settings: ProfileSettingsType
    advanced_settings: JSON = strawberry.field(name="advancedSettings")  # type: ignore # Add this line
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
            settings=ProfileSettingsType.from_pydantic(model.settings),
            advanced_settings=model.advanced_settings,  # Add this line
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


@strawberry.input
class UpdateAdvancedSettingsInput:
    profile_id: strawberry.ID
    settings: JSON  # type: ignore


@strawberry.type
class UpdateAdvancedSettingsSuccess:
    profile: ProfileType


@strawberry.type
class UpdateAdvancedSettingsError:
    code: str
    message: str
