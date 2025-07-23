from pydantic import BaseModel, Field


class InstallAddonRequest(BaseModel):
    manifest_url: str = Field(..., alias="manifestUrl")
