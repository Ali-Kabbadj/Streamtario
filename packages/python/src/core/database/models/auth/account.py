import uuid
from sqlalchemy import (
    String,
    ForeignKey,
    Boolean,
    Integer,
    Float,
    DateTime,
    func,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List, TYPE_CHECKING, Dict, Any
from core.database.models.base import Base
from datetime import datetime

if TYPE_CHECKING:
    from .addon import InstalledAddonOrm


class AccountOrm(Base):
    __tablename__ = "accounts"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=True)
    google_id: Mapped[str] = mapped_column(String, unique=True, nullable=True)
    facebook_id: Mapped[str] = mapped_column(String, unique=True, nullable=True)
    profiles: Mapped[List["ProfileOrm"]] = relationship(
        back_populates="account", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Account(id={self.id}, email='{self.email}')>"


class ProfileOrm(Base):
    __tablename__ = "profiles"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    avatar: Mapped[str] = mapped_column(String, nullable=True)
    is_private: Mapped[bool] = mapped_column(Boolean, default=False, nullable=True)
    pin_hash: Mapped[str] = mapped_column(String, nullable=True)
    settings: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"), nullable=False)
    account: Mapped["AccountOrm"] = relationship(back_populates="profiles")
    installed_addons: Mapped[List["InstalledAddonOrm"]] = relationship(
        back_populates="profile", cascade="all, delete-orphan"
    )
    playback_history: Mapped[List["PlaybackHistoryOrm"]] = relationship(
        back_populates="profile", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Profile(id={self.id}, name='{self.name}')>"


class PlaybackHistoryOrm(Base):
    __tablename__ = "playback_history"
    __table_args__ = (
        UniqueConstraint("profile_id", "content_id", name="uq_profile_content"),
    )

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    profile_id: Mapped[str] = mapped_column(ForeignKey("profiles.id"), nullable=False)
    content_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    item_type: Mapped[str] = mapped_column(String, nullable=False)  # ADD THIS LINE
    position_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    last_stream_details: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=True)
    watched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    profile: Mapped["ProfileOrm"] = relationship(back_populates="playback_history")

    def __repr__(self) -> str:
        return f"<PlaybackHistory(profile_id={self.profile_id}, content_id='{self.content_id}')>"
