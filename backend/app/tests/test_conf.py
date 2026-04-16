"""Tests for app.core.conf – Settings properties and OpenAI helpers."""

import os

import pytest

from app.core import conf
from app.core.conf import (
    OpenAIFeatureDisabled,
    apply_process_environment_hacks,
    openai,
    settings,
)

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


def test_require_enabled_raises_503_when_api_key_missing(
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setattr(openai, "API_KEY", "")

    with pytest.raises(OpenAIFeatureDisabled) as exc_info:
        openai.require_enabled("Document generation")

    exc = exc_info.value
    assert getattr(exc, "status_code", None) == 503
    assert (
        getattr(exc, "detail", "")
        == "Document generation is disabled because OPENAI_API_KEY is not configured."
    )


def test_apply_process_environment_hacks_skips_kmp_outside_local_env(
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.delenv("KMP_DUPLICATE_LIB_OK", raising=False)
    monkeypatch.setattr(settings, "ALLOW_KMP_DUPLICATE_LIB_OK", True)
    monkeypatch.setattr(settings, "ENVIRONMENT", "PROD")

    apply_process_environment_hacks(settings)

    assert "KMP_DUPLICATE_LIB_OK" not in os.environ


def test_apply_process_environment_hacks_sets_kmp_in_dev(
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.delenv("KMP_DUPLICATE_LIB_OK", raising=False)
    monkeypatch.setattr(settings, "ALLOW_KMP_DUPLICATE_LIB_OK", True)
    monkeypatch.setattr(settings, "ENVIRONMENT", "DEV")

    apply_process_environment_hacks(settings)

    assert os.environ["KMP_DUPLICATE_LIB_OK"] == "TRUE"


def test_openai_helpers_pass_api_key_directly(monkeypatch: pytest.MonkeyPatch):
    chat_model_calls: list[dict[str, object]] = []
    embedding_calls: list[dict[str, object]] = []

    class FakeChatOpenAI:
        def __init__(self, **kwargs):
            chat_model_calls.append(kwargs)

    class FakeOpenAIEmbeddings:
        def __init__(self, **kwargs):
            embedding_calls.append(kwargs)

    monkeypatch.setattr(conf, "ChatOpenAI", FakeChatOpenAI)
    monkeypatch.setattr(conf, "OpenAIEmbeddings", FakeOpenAIEmbeddings)

    local_openai = conf.OpenAI(API_KEY="unit-test-key")
    local_openai.get_model("gpt-5.4-mini-2026-03-17")
    local_openai.get_embeddings()

    assert chat_model_calls[0]["api_key"] == "unit-test-key"
    assert embedding_calls[0]["api_key"] == "unit-test-key"
