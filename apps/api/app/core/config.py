"""Configuration settings for PaisaPulse API."""
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_ENV: str = "development"
    DATABASE_URL: str = "sqlite:///./paisapulse.db"
    JWT_SECRET: str = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90"
    JWT_ACCESS_MINUTES: int = 30
    JWT_REFRESH_DAYS: int = 14
    COOKIE_DOMAIN: str = "localhost"
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001"
    MODEL_PATH: str = "./models/tfidf_lr_categorizer.joblib"
    MAX_UPLOAD_MB: int = 25
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_DEFAULT_CHAT_ID: str = ""
    CONTACT_TO_EMAIL: str = "you@example.com"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
