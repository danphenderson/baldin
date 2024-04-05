from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings
from toml import load as toml_load

PROJECT_DIR = Path(__file__).parent.parent
PYPROJECT_CONTENT = toml_load(f"{PROJECT_DIR}/pyproject.toml")["project"]


class Settings(BaseSettings):
    # LOGGING SETTINGS
    LOGGING_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"

    # PROJECT NAME, VERSION AND DESCRIPTION
    PROJECT_NAME: str = PYPROJECT_CONTENT["name"]
    VERSION: str = PYPROJECT_CONTENT["version"]
    DESCRIPTION: str = PYPROJECT_CONTENT["description"]

    # ETL SECRET KEYS
    OPENAI_API_KEY: str
    DATALAKE_URI: str = "public/seeds"

    class Config:
        case_sensitive = False
        env_file = PROJECT_DIR / ".env"
        env_file_encoding = "utf-8"
        extra = "allow"


def get_settings(**kwargs) -> Settings:
    settings = Settings(**kwargs)
    return settings


settings = get_settings()
