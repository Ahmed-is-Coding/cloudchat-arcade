from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AnyHttpUrl
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "CloudChat Arcade"
    environment: str = "dev"
    cors_origins: str = "http://localhost:3000"

    jwt_secret: str = "CHANGE_ME"
    jwt_alg: str = "HS256"
    jwt_expire_minutes: int = 720

    database_url: str
    redis_url: str

    jitsi_base_url: str = "https://meet.jit.si"

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
