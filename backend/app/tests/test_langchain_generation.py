from __future__ import annotations

import pytest
from langchain_core.messages import AIMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda
from pydantic import BaseModel

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


def test_generate_cover_letter_uses_explicit_model(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        langchain.conf.openai,
        "get_model",
        lambda model_name=None: (_ for _ in ()).throw(
            AssertionError("get_model should not be called")
        ),
    )

    model = RunnableLambda(lambda _: AIMessage(content="Generated cover letter"))

    result = langchain.generate_cover_letter(
        "profile",
        "job",
        "template",
        model=model,
    )

    assert result == "Generated cover letter"
    assert isinstance(result, str)


class _StructuredPromptResult(BaseModel):
    value: str


class _StructuredModel:
    def __init__(self) -> None:
        self.calls: list[tuple[type[BaseModel], str]] = []

    def with_structured_output(self, schema, method="function_calling"):
        self.calls.append((schema, method))
        return RunnableLambda(lambda _: schema(value="Generated structured output"))


@pytest.mark.asyncio
async def test_ainvoke_structured_prompt_uses_explicit_model(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        langchain.conf.openai,
        "get_model",
        lambda model_name=None: (_ for _ in ()).throw(
            AssertionError("get_model should not be called")
        ),
    )

    model = _StructuredModel()
    prompt = ChatPromptTemplate.from_messages([("user", "{input}")])

    result = await langchain.ainvoke_structured_prompt(
        prompt,
        {"input": "hello"},
        _StructuredPromptResult,
        model=model,
    )

    assert result.value == "Generated structured output"
    assert model.calls == [(_StructuredPromptResult, "function_calling")]
