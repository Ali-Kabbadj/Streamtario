from pydantic import BaseModel, Field
from typing import Optional


class TokenPayload(BaseModel):
    """Defines the data encoded within the JWT."""

    sub: str  # 'sub' (subject) is the standard claim for the user ID
    email: str


class TokenResponse(BaseModel):
    """The standard response shape when issuing new tokens."""

    access_token: str = Field(..., alias="accessToken")
    refresh_token: str = Field(..., alias="refreshToken")
    token_type: str = Field("bearer", alias="tokenType")
