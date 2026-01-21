from pydantic import BaseModel, Field


class ServerCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)


class ServerOut(BaseModel):
    id: int
    name: str
    owner_id: int

    class Config:
        from_attributes = True


class RoomCreate(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    is_private: bool = False
    invited_usernames: list[str] = Field(default_factory=list)


class RoomOut(BaseModel):
    id: int
    server_id: int
    name: str
    is_private: bool

    class Config:
        from_attributes = True
