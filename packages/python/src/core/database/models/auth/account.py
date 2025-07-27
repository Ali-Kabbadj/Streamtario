import uuid
from sqlalchemy import String, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List

from core.database.models.base import Base
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

    account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"), nullable=False)
    account: Mapped["AccountOrm"] = relationship(back_populates="profiles")

    installed_addons: Mapped[List["InstalledAddonOrm"]] = relationship(
        back_populates="profile", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Profile(id={self.id}, name='{self.name}')>"
