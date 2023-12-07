# app/core/openai.py

from re import A

from openai import AsyncOpenAI

from app.core import conf


def get_openai_client() -> AsyncOpenAI:
    return AsyncOpenAI(api_key=conf.openai.SECRET_KEY)
