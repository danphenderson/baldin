from pathlib import Path

from app.core import conf


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
    base_env.write_text((conf.PROJECT_DIR / ".env").read_text(encoding="utf-8"))
    local_env = tmp_path / ".env.local"
    local_env.write_text("FIRST_SUPERUSER_EMAIL=override@baldin.app\n")

    settings = conf.Settings(_env_file=(base_env, local_env))

    assert str(settings.FIRST_SUPERUSER_EMAIL) == "override@baldin.app"


def test_process_env_overrides_optional_local_env(
    tmp_path: Path,
    monkeypatch,
) -> None:
    base_env = tmp_path / ".env"
    base_env.write_text((conf.PROJECT_DIR / ".env").read_text(encoding="utf-8"))
    local_env = tmp_path / ".env.local"
    local_env.write_text("OPENAI_API_KEY=from-local-file\n")

    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    local_settings = conf.OpenAI(_env_file=(base_env, local_env))
    assert local_settings.API_KEY == "from-local-file"

    monkeypatch.setenv("OPENAI_API_KEY", "from-process-env")
    process_settings = conf.OpenAI(_env_file=(base_env, local_env))
    assert process_settings.API_KEY == "from-process-env"
