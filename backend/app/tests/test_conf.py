"""Tests for app.core.conf – Settings properties and OpenAI helpers."""

from app.core.conf import settings, openai


# ---------------------------------------------------------------------------
# Settings properties
# ---------------------------------------------------------------------------


def test_should_bootstrap_on_startup():
    # PYTEST env should enable bootstrap
    assert settings.SHOULD_BOOTSTRAP_ON_STARTUP is True


def test_should_not_run_crawler_scheduler_in_pytest():
    assert settings.SHOULD_RUN_CRAWLER_SCHEDULER is False


def test_should_not_run_reaper_in_pytest():
    assert settings.SHOULD_RUN_REAPER is False


def test_datalake_path():
    assert str(settings.DATALAKE_PATH).endswith("datalake")


def test_seeds_path():
    assert str(settings.SEEDS_PATH).endswith("seeds")


def test_project_name_from_pyproject():
    assert settings.PROJECT_NAME == "baldin"


def test_version_from_pyproject():
    assert settings.VERSION == "0.1.0-alpha"


# ---------------------------------------------------------------------------
# OpenAI tokenizer encoding lookup
# ---------------------------------------------------------------------------


def test_tokenizer_encoding_gpt5():
    assert openai.get_tokenizer_encoding("gpt-5.4-mini-2026-03-17") == "o200k_base"


def test_tokenizer_encoding_gpt4():
    assert openai.get_tokenizer_encoding("gpt-4-0125-preview") == "cl100k_base"


def test_tokenizer_encoding_gpt4o():
    assert openai.get_tokenizer_encoding("gpt-4o-2024-05-13") == "o200k_base"


def test_tokenizer_encoding_o1():
    assert openai.get_tokenizer_encoding("o1-preview") == "o200k_base"


def test_tokenizer_encoding_unknown_fallback():
    assert openai.get_tokenizer_encoding("some-unknown-model") == "cl100k_base"


def test_tokenizer_encoding_default_model():
    # Should use the configured DEFAULT_MODEL
    result = openai.get_tokenizer_encoding()
    assert result in ("o200k_base", "cl100k_base")


def test_get_chunk_size_known():
    assert openai.get_chunk_size("gpt-4-0125-preview") == int(128_000 * 0.8)


def test_get_chunk_size_unknown():
    assert openai.get_chunk_size("unknown-model") == int(4_096 * 0.8)
