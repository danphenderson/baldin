from __future__ import annotations

import pytest
from langchain_core.messages import AIMessage
from langchain_core.runnables import RunnableLambda

from app.core import langchain


@pytest.mark.parametrize(
    ("generator", "expected"),
    [
        (langchain.generate_cover_letter, "Generated cover letter"),
        (langchain.generate_resume, "Generated resume"),
    ],
)
def test_generation_helpers_return_plain_strings(
    monkeypatch: pytest.MonkeyPatch,
    generator,
    expected: str,
) -> None:
    monkeypatch.setattr(
        langchain.conf.openai,
        "get_model",
        lambda model_name=None: RunnableLambda(lambda _: AIMessage(content=expected)),
    )

    result = generator("profile", "job", "template")

    assert result == expected
    assert isinstance(result, str)
