from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class AdminUserOut(BaseModel):
    id: int
    email: EmailStr
    username: str
    display_name: str
    role: str
    is_banned: bool

    class Config:
        from_attributes = True


class AdminUserUpdateIn(BaseModel):
    role: Optional[str] = Field(default=None, description="user/mod/admin")
    is_banned: Optional[bool] = None
    username: Optional[str] = Field(default=None, min_length=3, max_length=40)
    display_name: Optional[str] = Field(default=None, max_length=60)


class AdminServerOut(BaseModel):
    id: int
    name: str
    owner_id: int

    class Config:
        from_attributes = True


class AdminGameOut(BaseModel):
    id: int
    key: str
    name: str
    description: str
    min_players: int
    max_players: int
    enabled: bool

    class Config:
        from_attributes = True


class AdminGameUpdateIn(BaseModel):
    enabled: Optional[bool] = None
    name: Optional[str] = Field(default=None, max_length=80)
    description: Optional[str] = Field(default=None, max_length=160)
    min_players: Optional[int] = None
    max_players: Optional[int] = None
