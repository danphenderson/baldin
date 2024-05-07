from pydantic import Field
from typing import Literal
from pathlib import Path
from pydantic_settings import BaseSettings
from toml import load as toml_load
from os import getenv

PROJECT_DIR = Path(__file__).parent.parent
PYPROJECT_CONTENT = toml_load(f"{PROJECT_DIR}/pyproject.toml")["project"]

class _BaseSettings(BaseSettings):
    class Config:
        case_sensitive = False
        env_file = PROJECT_DIR / ".env"
        env_file_encoding = "utf-8"
        extra = "allow"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)


class Settings(_BaseSettings):

    # LOGGING SETTINGS
    LOGGING_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    LOGGING_FILE_NAME: str = f"{PROJECT_DIR}/var/log"

    # PROJECT NAME, VERSION AND DESCRIPTION
    PROJECT_NAME: str = PYPROJECT_CONTENT["name"]
    VERSION: str = PYPROJECT_CONTENT["version"]
    DESCRIPTION: str = PYPROJECT_CONTENT["description"]

    # BALDIN SETTINGS
    ETL_IMAGE_URI: str = getenv("ETL_IMAGE_URI", "baldin/etl:latest")
    API_IMAGE_URI: str = getenv("API_IMAGE_URI", "baldin/api:latest")

    # AWS SETTINGS
    AWS_REGION: str
    AWS_ACCOUNT: str

    # DERIVED SETTINGS
    @property
    def DATALAKE_BUCKET_NAME(self):
        return f"baldin-data-lake-{self.AWS_ACCOUNT}"

    @property
    def PUBLIC_STATIC_ASSETS_BUCKET_NAME(self):
        return f"baldin-public-static-assets-{self.AWS_ACCOUNT}"


    class Config:
        case_sensitive = False
        env_file = PROJECT_DIR / ".env"
        env_file_encoding = "utf-8"
        extra = "allow"

def get_settings(**kwargs) -> Settings:
    settings = Settings(**kwargs)
    return settings

settings = get_settings()
