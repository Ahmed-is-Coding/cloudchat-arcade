from pydantic import BaseModel, EmailStr, Field


class RegisterIn(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=40)
    password: str = Field(min_length=6, max_length=200)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    email: EmailStr
    username: str
    display_name: str
    bio: str
    avatar_color: str
    avatar_url: str
    role: str

    class Config:
        from_attributes = True


class ProfileUpdateIn(BaseModel):
    display_name: str = Field(default="", max_length=60)
    bio: str = Field(default="", max_length=200)
    avatar_color: str = Field(default="#00f5ff", max_length=24)
