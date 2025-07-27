from pydantic import BaseModel
from typing import Literal

SocialProvider = Literal["google", "facebook"]


class CreateAccountRequest(BaseModel):
    email: str
    password: str


class SocialLoginRequest(BaseModel):
    provider: SocialProvider
    social_id: str
    email: str
