from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Config(BaseSettings):
    GEMINI_API_KEY: str
    GITHUB_ACCESS_TOKEN: str
    REFRESH_SECRET: str
    DB_URL: str
    GEMINI_PARSE_MODEL: str = "gemini-3.5-flash-lite"
    GEMINI_MODEL: str = "gemini-3.8-flash"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_config() -> Config:
    return Config()
