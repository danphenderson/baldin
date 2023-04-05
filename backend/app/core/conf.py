# app/config.py
from pathlib import Path
from typing import Literal, Union
from toml import load as toml_load
from pydantic import AnyHttpUrl, AnyUrl, BaseSettings, EmailStr, validator
from selenium.webdriver.chrome.options import Options as ChromeOptions

PROJECT_DIR = Path(__file__).parent.parent.parent
PYPROJECT_CONTENT = toml_load(f"{PROJECT_DIR}/pyproject.toml")["project"]

class _Config:
    case_sensitive = False
    env_file = PROJECT_DIR / ".env"
    env_file_encoding = "utf-8"


class _BaseSettings(BaseSettings):

    class Config(_Config):
        pass

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

class Settings(_BaseSettings):
    # CORE SETTINGS
    SECRET_KEY: str
    ENVIRONMENT: Literal["DEV", "PYTEST", "STAGE", "PRODUCTION"]
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    BACKEND_CORS_ORIGINS: Union[str, list[AnyHttpUrl]]
    LOGGING_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
    LOGGING_FILE_NAME: str = "app_log"
    PUBLIC_ASSETS_DIR: str = "public"
    
    # PROJECT NAME, VERSION AND DESCRIPTION
    PROJECT_NAME: str = PYPROJECT_CONTENT["name"]
    VERSION: str = PYPROJECT_CONTENT["version"]
    DESCRIPTION: str = PYPROJECT_CONTENT["description"]

    # POSTGRESQL DEFAULT DATABASE
    DEFAULT_DATABASE_HOSTNAME: str
    DEFAULT_DATABASE_USER: str
    DEFAULT_DATABASE_PASSWORD: str
    DEFAULT_DATABASE_PORT: str
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
            user=values["DEFAULT_DATABASE_USER"],
            password=values["DEFAULT_DATABASE_PASSWORD"],
            host=values["DEFAULT_DATABASE_HOSTNAME"],
            port=values["DEFAULT_DATABASE_PORT"],
            path=f"/{values['DEFAULT_DATABASE_DB']}",
        )

    @validator("TEST_SQLALCHEMY_DATABASE_URI")
    def _assemble_test_db_connection(cls, v: str, values: dict[str, str]) -> str:
        return AnyUrl.build(
            scheme="postgresql+asyncpg",
            user=values["TEST_DATABASE_USER"],
            password=values["TEST_DATABASE_PASSWORD"],
            host=values["TEST_DATABASE_HOSTNAME"],
            port=values["TEST_DATABASE_PORT"],
            path=f"/{values['TEST_DATABASE_DB']}",
        )

    class Config:
        env_file = f"{PROJECT_DIR}/.env"
        case_sensitive = True


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
        options.add_argument('--no-sandbox')
        options.add_argument('--window-size=1420,10')
        options.add_argument('--ignore-certificate-errors')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument("--headless")
        options.add_argument("--dump-dom")
        options.add_argument("--incognito")
        return options


class OpenAI(_BaseSettings, env_prefix="OPENAI_"):
    """
    Configuration for OpenAI API.
    
    See https://openai.com/ for more information.
    """
    KEY: str = ""
    MODEL: str = "gpt-3.5-turbo"


class Linkedin(_BaseSettings, env_prefix="LINKEDIN_"):
    """
    Configuration logging into LinkedIn.
    """
    USERNAME: str = ""
    PASSWORD: str = ""

    search_endpoint: str = "https://www.linkedin.com/jobs/search/?currentJobId=3538510509&f_E=3%2C4&f_JT=F%2CC&f_TPR=r604800&f_WT=2&keywords=python%20aws"
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
    openai = OpenAI(**kwargs)
    return openai


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

