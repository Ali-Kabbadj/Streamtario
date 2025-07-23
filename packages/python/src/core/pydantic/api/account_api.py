from pydantic import BaseModel


class CreateAccountRequest(BaseModel):
    email: str
    password: str
