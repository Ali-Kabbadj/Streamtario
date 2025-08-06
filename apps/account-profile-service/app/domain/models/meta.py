from pydantic import BaseModel


class Meta(BaseModel):
    id: str
    name: str
    type: str
