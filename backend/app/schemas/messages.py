from pydantic import BaseModel


class MessageOut(BaseModel):
    id: int
    room_id: int
    sender_id: int

    username: str
    display_name: str
    avatar_color: str
    avatar_url: str

    content: str
    created_at: str  # ISO

    class Config:
        from_attributes = True
