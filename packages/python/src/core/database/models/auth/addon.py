import uuid
from sqlalchemy import String, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import TYPE_CHECKING

from core.database.models.base import Base

# This block is only evaluated by type checkers, not at runtime.
if TYPE_CHECKING:
    from .account import ProfileOrm


class InstalledAddonOrm(Base):
    __tablename__ = "installed_addons"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    manifest_url: Mapped[str] = mapped_column(String, nullable=False)
    manifest_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    installed_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    profile_id: Mapped[str] = mapped_column(ForeignKey("profiles.id"), nullable=False)
    profile: Mapped["ProfileOrm"] = relationship(back_populates="installed_addons")

    def __repr__(self) -> str:
        return f"<InstalledAddon(manifest_id='{self.manifest_id}', profile_id='{self.profile_id}')>"
