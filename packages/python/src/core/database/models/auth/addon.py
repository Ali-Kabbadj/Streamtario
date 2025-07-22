import uuid
from core.database.models.auth.account import ProfileOrm
from sqlalchemy import String, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime

from core.database.models.base import Base


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

    # --- THE CORRECTION ---
    # The addon linked to a PROFILE, not an account.
    profile_id: Mapped[str] = mapped_column(ForeignKey("profiles.id"), nullable=False)
    profile: Mapped["ProfileOrm"] = relationship(back_populates="installed_addons")

    def __repr__(self) -> str:
        return f"<InstalledAddon(manifest_id='{self.manifest_id}', profile_id='{self.profile_id}')>"
