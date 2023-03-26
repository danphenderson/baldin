# project/app/config.py
import os
import logging

from pydantic import AnyUrl, BaseSettings

log = logging.getLogger("uvicorn")

class Settings(BaseSettings):
    environment : str
    database_url : AnyUrl

    class Config:
        from pathlib import Path
        env_file = Path('.').parent.parent / ".env"
        env_file_encoding = "utf-8"

def get_settings(**kwargs) -> BaseSettings:
    log.info("Loading config settings from the environment...")
    return Settings(**kwargs)
