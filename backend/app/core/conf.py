# app/core/conf.py
from os import environ, getenv
from pathlib import Path
from typing import Literal, Union

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_openai import ChatOpenAI
from pydantic import AnyHttpUrl, AnyUrl, EmailStr, validator
from pydantic_settings import BaseSettings
from selenium.webdriver.chrome.options import Options as ChromeOptions
from toml import load as toml_load

PROJECT_DIR = Path(__file__).parent.parent.parent
PYPROJECT_CONTENT = toml_load(f"{PROJECT_DIR}/pyproject.toml")["project"]

# FIXME: A big hack here to resolve this error when posting to `extractor/run` in retrieval mode:
# OMP: Error #15: Initializing libomp.dylib, but found libomp.dylib already initialized.
# OMP: Hint This means that multiple copies of the OpenMP runtime have been linked into the program. That is dangerous, since it can degrade performance or cause incorrect results. The best thing to do is to ensure that only a single OpenMP runtime is linked into the process, e.g. by avoiding static linking of the OpenMP runtime in any library. As an unsafe, unsupported, undocumented workaround you can set the environment variable KMP_DUPLICATE_LIB_OK=TRUE to allow the program to continue to execute, but that may cause crashes or silently produce incorrect results. For more information, please see http://openmp.llvm.org/


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
    LOGGING_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "DEBUG"
    LOGGING_FILE_NAME: str = "app.log"
    PUBLIC_ASSETS_DIR: str = "public"

    # PROJECT NAME, VERSION AND DESCRIPTION
    PROJECT_NAME: str = PYPROJECT_CONTENT["name"]
    VERSION: str = PYPROJECT_CONTENT["version"]
    DESCRIPTION: str = PYPROJECT_CONTENT["description"]

    # Max concurrency used for extracting content from documents.
    # A long document is broken into smaller chunks this controls
    # how many chunks are processed concurrently.
    MAX_CONCURRENCY: int

    # Max number of chunks to process per documents
    # When a long document is split into chunks, this controls
    # how many of those chunks will be processed.
    # Set to 0 or negative to disable the max chunks limit.
    MAX_CHUNKS: int = 0

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

    # DATALAKE SETTINGS
    DATALAKE_URI: str = "public/seeds"

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

    DRIVER_PATH: str = ""
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

    API_KEY: str
    COMPLETION_MODEL: str = "gpt-4-0125-preview"
    DEFAULT_MODEL: str = "gpt-3.5-turbo"

    @property
    def SUPPORTED_MODELS(self):
        """Get models according to environment secrets."""
        models = {}
        if self.API_KEY:
            models["gpt-3.5-turbo"] = {
                "chat_model": ChatOpenAI(model="gpt-3.5-turbo", temperature=0),
                "description": "GPT-3.5 Turbo",
            }
            if getenv("DISABLE_GPT4", "").lower() != "true":
                models["gpt-4-0125-preview"] = {
                    "chat_model": ChatOpenAI(model="gpt-4-0125-preview", temperature=0),
                    "description": "GPT-4 0125 Preview",
                }

        return models

    def get_model(self, name: str | None = None) -> BaseChatModel:
        """Get the model."""
        if name is None:
            return self.SUPPORTED_MODELS[self.COMPLETION_MODEL]["chat_model"]

        else:
            supported_model_names = list(self.SUPPORTED_MODELS.keys())
            if name not in supported_model_names:
                raise ValueError(
                    f"Model {name} not found. Supported models: {supported_model_names}"
                )
            else:
                return self.SUPPORTED_MODELS[name]["chat_model"]

    def get_chunk_size(self, name: str) -> int:
        """Get the chunk size."""
        CHUNK_SIZES = {  # in tokens, defaults to int(4_096 * 0.8). Override here.
            "gpt-4-0125-preview": int(128_000 * 0.8),
        }
        return CHUNK_SIZES.get(name, int(4_096 * 0.8))


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
    _openai.api_key = settings.API_KEY
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

environ["OPENAI_API_KEY"] = openai.API_KEY
environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
