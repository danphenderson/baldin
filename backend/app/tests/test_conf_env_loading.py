from pathlib import Path

from app.core import conf

_FALLBACK_BASE_ENV = """\
SECRET_KEY=DVnFmhwvjEhJZpuhndxjhlezxQPJmBIIkMDEmFREWQADPcUnrG
MFA_ENCRYPTION_KEY=
ENVIRONMENT=DEV
ACCESS_TOKEN_EXPIRE_MINUTES=11520
BACKEND_CORS_ORIGINS=http://localhost:5173,http://localhost:8004
MAX_CONCURRENCY=8
MAX_CHUNKS=-1
LOGGING_LEVEL=DEBUG
DEFAULT_DATABASE_HOSTNAME=db
DEFAULT_DATABASE_USER=postgres
DEFAULT_DATABASE_PASSWORD=postgres
DEFAULT_DATABASE_PORT=5432
DEFAULT_DATABASE_DB=db
TEST_DATABASE_HOSTNAME=test_db
TEST_DATABASE_USER=postgres
TEST_DATABASE_PASSWORD=postgres
TEST_DATABASE_PORT=5432
TEST_DATABASE_DB=test_db
FIRST_SUPERUSER_EMAIL=admin@baldin.app
FIRST_SUPERUSER_PASSWORD=Admin1Pass
OPENAI_API_KEY=""
SENTRY_DSN=
SENTRY_TRACES_SAMPLE_RATE=0.0
REDIS_URL=redis://redis:6379/0
CRAWLER_QUEUE_NAME=crawler_jobs
CRAWLER_EXECUTION_MODE=inline
CRAWLER_SCHEDULER_INTERVAL=60
ETL_SERVICE_URL=http://etl-service:8010
ETL_SERVICE_TIMEOUT_SECONDS=180
"""


def _write_base_env(path: Path) -> Path:
    repo_env = conf.PROJECT_DIR / ".env"
    if repo_env.exists():
        path.write_text(repo_env.read_text(encoding="utf-8"), encoding="utf-8")
        return path

    path.write_text(_FALLBACK_BASE_ENV, encoding="utf-8")
    return path


def test_settings_load_repo_tracked_env_defaults() -> None:
    settings = conf.Settings(_env_file=(conf.PROJECT_DIR / ".env",))

    assert settings.DEFAULT_DATABASE_HOSTNAME == "db"
    assert str(settings.FIRST_SUPERUSER_EMAIL) == "admin@baldin.app"


def test_settings_allow_optional_env_local_override(
    tmp_path: Path,
    monkeypatch,
) -> None:
    monkeypatch.delenv("FIRST_SUPERUSER_EMAIL", raising=False)

    base_env = tmp_path / ".env"
    _write_base_env(base_env)
    local_env = tmp_path / ".env.local"
    local_env.write_text("FIRST_SUPERUSER_EMAIL=override@baldin.app\n")

    settings = conf.Settings(_env_file=(base_env, local_env))

    assert str(settings.FIRST_SUPERUSER_EMAIL) == "override@baldin.app"


def test_process_env_overrides_optional_local_env(
    tmp_path: Path,
    monkeypatch,
) -> None:
    base_env = tmp_path / ".env"
    _write_base_env(base_env)
    local_env = tmp_path / ".env.local"
    local_env.write_text("OPENAI_API_KEY=from-local-file\n")

    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    local_settings = conf.OpenAI(_env_file=(base_env, local_env))
    assert local_settings.API_KEY == "from-local-file"

    monkeypatch.setenv("OPENAI_API_KEY", "from-process-env")
    process_settings = conf.OpenAI(_env_file=(base_env, local_env))
    assert process_settings.API_KEY == "from-process-env"


def test_openai_settings_allow_missing_api_key(monkeypatch) -> None:
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    settings = conf.OpenAI(_env_file=("nonexistent",))

    assert settings.API_KEY == ""
    assert settings.is_configured is False


def test_settings_treat_blank_sentry_traces_sample_rate_as_disabled(
    monkeypatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setenv("SENTRY_TRACES_SAMPLE_RATE", "")

    settings = conf.Settings(_env_file=(_write_base_env(tmp_path / ".env"),))

    assert settings.SENTRY_TRACES_SAMPLE_RATE == 0.0
