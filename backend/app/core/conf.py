# app/core/conf.py
from pathlib import Path
from typing import Literal, Union

from pydantic import AnyHttpUrl, AnyUrl, EmailStr, validator
from pydantic_settings import BaseSettings
from selenium.webdriver.chrome.options import Options as ChromeOptions
from toml import load as toml_load

PROJECT_DIR = Path(__file__).parent.parent.parent
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
    # CORE SETTINGS
    SECRET_KEY: str
    ENVIRONMENT: Literal["DEV", "PYTEST", "STAGE", "PRODUCTION"]
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    BACKEND_CORS_ORIGINS: Union[str, list[AnyHttpUrl]]
    LOGGING_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    LOGGING_FILE_NAME: str = "app.log"
    PUBLIC_ASSETS_DIR: str = "public"

    # PROJECT NAME, VERSION AND DESCRIPTION
    PROJECT_NAME: str = PYPROJECT_CONTENT["name"]
    VERSION: str = PYPROJECT_CONTENT["version"]
    DESCRIPTION: str = PYPROJECT_CONTENT["description"]

    # POSTGRESQL DEFAULT DATABASE
    DEFAULT_DATABASE_HOSTNAME: str
    DEFAULT_DATABASE_USER: str
    DEFAULT_DATABASE_PASSWORD: str
    DEFAULT_DATABASE_PORT: int
    DEFAULT_DATABASE_DB: str
    DEFAULT_SQLALCHEMY_DATABASE_URI: str = ""

    # POSTGRESQL TEST DATABASE
    TEST_DATABASE_HOSTNAME: str
    TEST_DATABASE_USER: str
    TEST_DATABASE_PASSWORD: str
    TEST_DATABASE_PORT: str
    TEST_DATABASE_DB: str
    TEST_SQLALCHEMY_DATABASE_URI: str = ""

    # FIRST SUPERUSER
    FIRST_SUPERUSER_EMAIL: EmailStr
    FIRST_SUPERUSER_PASSWORD: str

    # VALIDATORS
    @validator("BACKEND_CORS_ORIGINS")
    def _assemble_cors_origins(cls, cors_origins: Union[str, list[AnyHttpUrl]]):
        if isinstance(cors_origins, str):
            return [item.strip() for item in cors_origins.split(",")]
        return cors_origins

    @validator("DEFAULT_SQLALCHEMY_DATABASE_URI")
    def _assemble_default_db_connection(cls, v: str, values: dict[str, str]) -> str:
        return AnyUrl.build(
            scheme="postgresql+asyncpg",
            username=values["DEFAULT_DATABASE_USER"],
            password=values["DEFAULT_DATABASE_PASSWORD"],
            host=values["DEFAULT_DATABASE_HOSTNAME"],
            port=values["DEFAULT_DATABASE_PORT"],  # type: ignore
            path=f"{values['DEFAULT_DATABASE_DB']}",
        )


class Chrome(_BaseSettings, env_prefix="CHROME_"):
    """
    Configuration for a Google Chrome web driver.

    See https://pypi.org/project/selenium/, `ChromeOptions` for more information.
    """

    DRIVER_PATH: str
    SHM_SIZE: str = "2g"

    @property
    def options(self) -> ChromeOptions:
        options = ChromeOptions()
        options.add_argument("--no-sandbox")  # Bypass OS security model
        # options.add_argument("--headless")  # Run in headless mode
        # options.add_argument("--disable-gpu")  # Disable GPU hardware acceleration
        options.add_argument("--window-size=1420,1080")  # Set window size
        options.add_argument("--ignore-certificate-errors")  # Ignore certificate errors
        options.add_argument(
            "--disable-dev-shm-usage"
        )  # Overcome limited resource problems
        # options.add_argument("--disable-extensions")  # Disable extensions
        options.add_argument(
            "--disable-web-security"
        )  # Disable web security - use with caution
        # options.add_argument("--incognito")  # Use incognito mode
        # Add any other arguments you find necessary
        return options


class OpenAI(_BaseSettings, env_prefix="OPENAI_"):
    """
    Configuration for OpenAI API.

    See https://openai.com/ for more information.
    """

    SECRET_KEY: str = ""
    COMPLETION_MODEL: str = "gpt-3.5-turbo"


class Linkedin(_BaseSettings, env_prefix="LINKEDIN_"):
    """
    Configuration logging into LinkedIn.
    """

    USERNAME: str = ""
    PASSWORD: str = ""

    search_endpoint: str = "https://www.linkedin.com/jobs/search/?currentJobId=3761064348&keywords=data%20engineer&origin=JOBS_HOME_SEARCH_BUTTON&refresh=true"
    profile_endpoint: str = "https://www.linkedin.com/in/daniel-henderson-6a9485bb/"
    login_endpoint: str = "https://www.linkedin.com/login"


class Glassdoor(_BaseSettings, env_prefix="GLASSDOOR_"):
    """
    Configuration logging into Glassdoor.
    """

    USERNAME: str = ""
    PASSWORD: str = ""


def get_settings(**kwargs) -> Settings:
    settings = Settings(**kwargs)
    return settings


def get_chrome_settings(**kwargs) -> Chrome:
    chrome = Chrome(**kwargs)
    return chrome


def get_openai_settings(**kwargs) -> OpenAI:
    import openai as _openai

    settings = OpenAI(**kwargs)
    _openai.api_key = settings.SECRET_KEY
    return settings


def get_linkedin_settings(**kwargs) -> Linkedin:
    linkedin = Linkedin(**kwargs)
    return linkedin


def get_glassdoor_settings(**kwargs) -> Glassdoor:
    glassdoor = Glassdoor(**kwargs)
    return glassdoor


settings = get_settings()

chrome = get_chrome_settings()

openai = get_openai_settings()

linkedin = get_linkedin_settings()

glassdoor = get_glassdoor_settings()
