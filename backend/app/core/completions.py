from openai import OpenAI

from app.core import conf

client = OpenAI(api_key=conf.openai.SECRET_KEY)
