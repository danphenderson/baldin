# app/core/openai.py

from openai import AsyncOpenAI

from app.core import conf


def get_openai_client() -> AsyncOpenAI:
    return AsyncOpenAI(api_key=conf.openai.SECRET_KEY)


async def chat_completion(model, messages, stop=None):
    openai_client = get_openai_client()
    completion = await openai_client.chat.completions.create(
        model=model, messages=messages
    )
    completion_choice = completion.choices.pop()
    completion_content = completion_choice.message.content  # type: ignore
    return completion_content
