from pydantic import BaseModel


class GameOut(BaseModel):
    key: str
    name: str
    description: str
    min_players: int
    max_players: int
    enabled: bool

    class Config:
        from_attributes = True


class LeaderboardEntry(BaseModel):
    user_id: int
    username: str
    best_score: int
