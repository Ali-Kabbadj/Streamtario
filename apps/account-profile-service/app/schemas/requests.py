from pydantic import BaseModel, Field


class CreateAccountRequest(BaseModel):
    email: str
    password: str


class InstallAddonRequest(BaseModel):
    manifest_url: str = Field(..., alias="manifestUrl")
