# app/core/openai.py

from openai import AsyncOpenAI

from .conf import settings


def get_openai_client() -> AsyncOpenAI:
    return AsyncOpenAI(api_key=settings.SECRET_OPENAI_KEY)


async def chat_completion(model, messages, stop=None):
    openai_client = get_openai_client()
    completion = await openai_client.chat.completions.create(
        model=model, messages=messages
    )
    completion_choice = completion.choices.pop()
    completion_content = completion_choice.message.content  # type: ignore
    return completion_content
