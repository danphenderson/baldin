# Path: app/core/conf.py
from os import environ, getenv
from pathlib import Path
from typing import Literal, Union

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_openai import ChatOpenAI
from pydantic import AnyHttpUrl, AnyUrl, EmailStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from toml import load as toml_load

PROJECT_DIR = Path(__file__).parent.parent.parent
PYPROJECT_CONTENT = toml_load(f"{PROJECT_DIR}/pyproject.toml")["project"]

# FIXME: A big hack here to resolve this error when posting to `extractor/run` in retrieval mode:
# OMP: Error #15: Initializing libomp.dylib, but found libomp.dylib already initialized.
# OMP: Hint This means that multiple copies of the OpenMP runtime have been linked into the program. That is dangerous, since it can degrade performance or cause incorrect results. The best thing to do is to ensure that only a single OpenMP runtime is linked into the process, e.g. by avoiding static linking of the OpenMP runtime in any library. As an unsafe, unsupported, undocumented workaround you can set the environment variable KMP_DUPLICATE_LIB_OK=TRUE to allow the program to continue to execute, but that may cause crashes or silently produce incorrect results. For more information, please see http://openmp.llvm.org/


class _BaseSettings(BaseSettings):
    model_config = SettingsConfigDict(
        case_sensitive=False,
        env_file=PROJECT_DIR / ".env",
        env_file_encoding="utf-8",
        extra="allow",
    )

    def __init__(self, **kwargs):
        super().__init__(**kwargs)


class Settings(_BaseSettings):
    # CORE SETTINGS
    SECRET_KEY: str
    MFA_ENCRYPTION_KEY: str | None = None
    ENVIRONMENT: Literal["DEV", "PYTEST", "STAGE", "PROD"]
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    BACKEND_CORS_ORIGINS: Union[str, list[AnyHttpUrl]]
    LOGGING_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
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

    # CRAWLER QUEUE SETTINGS
    # Optional Redis URL. When absent the crawler falls back to inline execution.
    REDIS_URL: str | None = None
    # Name of the Redis list used as the crawler job queue.
    CRAWLER_QUEUE_NAME: str = "crawler_jobs"
    # Execution mode: "inline" runs crawls in the API process;
    # "worker" enqueues jobs to Redis for the crawler-worker service.
    CRAWLER_EXECUTION_MODE: Literal["inline", "worker"] = "inline"
    # How often (in seconds) the crawler scheduler polls for pending runs.
    CRAWLER_SCHEDULER_INTERVAL: int = 60

    # VALIDATORS
    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def _assemble_cors_origins(
        cls, cors_origins: Union[str, list[AnyHttpUrl]]
    ) -> Union[str, list[AnyHttpUrl]]:
        if isinstance(cors_origins, str):
            return [item.strip() for item in cors_origins.split(",")]
        return cors_origins

    @model_validator(mode="after")
    def _assemble_db_connections(self) -> "Settings":
        self.DEFAULT_SQLALCHEMY_DATABASE_URI = str(
            AnyUrl.build(
                scheme="postgresql+asyncpg",
                username=self.DEFAULT_DATABASE_USER,
                password=self.DEFAULT_DATABASE_PASSWORD,
                host=self.DEFAULT_DATABASE_HOSTNAME,
                port=self.DEFAULT_DATABASE_PORT,
                path=self.DEFAULT_DATABASE_DB,
            )
        )

        self.TEST_SQLALCHEMY_DATABASE_URI = str(
            AnyUrl.build(
                scheme="postgresql+asyncpg",
                username=self.TEST_DATABASE_USER,
                password=self.TEST_DATABASE_PASSWORD,
                host=self.TEST_DATABASE_HOSTNAME,
                port=int(self.TEST_DATABASE_PORT),
                path=self.TEST_DATABASE_DB,
            )
        )
        return self

    @property
    def DATALAKE_PATH(self) -> Path:
        return Path(self.PUBLIC_ASSETS_DIR) / "datalake"

    @property
    def SEEDS_PATH(self) -> Path:
        return Path(self.PUBLIC_ASSETS_DIR) / "seeds"

    @property
    def LOGS_PATH(self) -> Path:
        return Path(self.PUBLIC_ASSETS_DIR) / "var" / "logs"

    @property
    def SHOULD_LOG_API_TO_CONSOLE(self) -> bool:
        return self.ENVIRONMENT == "DEV"

    @property
    def SHOULD_LOG_API_TO_FILE(self) -> bool:
        return self.ENVIRONMENT == "DEV"

    CRAWLER_SCHEDULER_ENABLED: bool = True
    RUN_REAPER_ENABLED: bool = True

    @property
    def SHOULD_BOOTSTRAP_ON_STARTUP(self) -> bool:
        return self.ENVIRONMENT in {"DEV", "PYTEST"}

    @property
    def SHOULD_RUN_CRAWLER_SCHEDULER(self) -> bool:
        if self.ENVIRONMENT == "PYTEST":
            return False
        return self.CRAWLER_SCHEDULER_ENABLED

    @property
    def SHOULD_RUN_REAPER(self) -> bool:
        if self.ENVIRONMENT == "PYTEST":
            return False
        return self.RUN_REAPER_ENABLED


class OpenAI(_BaseSettings, env_prefix="OPENAI_"):
    """
    Configuration for OpenAI API.

    See https://openai.com/ for more information.
    """

    API_KEY: str
    COMPLETION_MODEL: str = "gpt-5.4-nano-2026-03-17"
    DEFAULT_MODEL: str = "gpt-5.4-mini-2026-03-17"
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSIONS: int = 1536

    @property
    def SUPPORTED_MODELS(self):
        """Get models according to environment secrets."""
        models = {}
        if self.API_KEY:
            models["gpt-5.4-mini-2026-03-17"] = {
                "chat_model": ChatOpenAI(
                    model="gpt-5.4-mini-2026-03-17", temperature=0
                ),
                "description": "GPT-5.4 Mini",
            }
            if getenv("DISABLE_GPT4", "").lower() != "true":
                models["gpt-5.4-nano-2026-03-17"] = {
                    "chat_model": ChatOpenAI(
                        model="gpt-5.4-nano-2026-03-17", temperature=0
                    ),
                    "description": "GPT-5.4 Nano",
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

    def get_tokenizer_encoding(self, name: str | None = None) -> str:
        """Get an explicit tiktoken encoding for the configured model.

        Newly released model names can lag behind tiktoken's automatic model
        mapping, so callers that only need token counting should prefer an
        explicit encoding over model-name lookup.
        """
        model_name = name or self.DEFAULT_MODEL
        encodings_by_prefix = {
            "gpt-5": "o200k_base",
            "gpt-4.1": "o200k_base",
            "gpt-4o": "o200k_base",
            "o1": "o200k_base",
            "o3": "o200k_base",
            "o4": "o200k_base",
            "gpt-4": "cl100k_base",
            "gpt-3.5": "cl100k_base",
            "text-embedding-3": "cl100k_base",
            "text-embedding-ada": "cl100k_base",
        }
        for prefix, encoding_name in encodings_by_prefix.items():
            if model_name.startswith(prefix):
                return encoding_name
        return "cl100k_base"


class Linkedin(_BaseSettings, env_prefix="LINKEDIN_"):
    """
    Configuration logging into LinkedIn.
    """

    USERNAME: str = ""
    PASSWORD: str = ""

    search_endpoint: str = (
        "https://www.linkedin.com/jobs/search/?currentJobId=3887133600"
    )
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

openai = get_openai_settings()

linkedin = get_linkedin_settings()

glassdoor = get_glassdoor_settings()

# FIXME: Clean up the following hacks.
environ["OPENAI_API_KEY"] = openai.API_KEY
environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
