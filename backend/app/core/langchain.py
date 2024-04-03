# APP imports
import json
import os

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate


# Third party imports
from langchain_openai import ChatOpenAI

from app import models, schemas
from app.core import conf, db

# ENSURE THAT THE OPENAI_API_KEY IS SET and Define the model
os.environ["OPENAI_API_KEY"] = conf.openai.API_KEY


llm = ChatOpenAI(model="gpt-4")  # type: ignore

str_output_parser = StrOutputParser()



def generate_cover_letter(profile, job, template) -> str:
    generation_template = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are a helpful AI assistant that helps users generate cover letters for job applications.",
            ),
            ("user", "Hello, tailor my resume based on my background: {profile}"),
            (
                "system",
                """Great, please provide me with a job desctiption and I will generate a cover letter from this template: {template}.""",
            ),
            ("user", "Awesome! Here are the job details:\n{job}"),
        ]
    )
    chain = generation_template | llm | str_output_parser
    return chain.invoke({"profile": profile, "job": job, "template": template})


def generate_resume(profile, job, template) -> str:
    generation_template = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are a helpful AI assistant that helps users generate resumes for job applications.",
            ),
            ("user", "Hello, tailor my resume based on my background: {profile}"),
            (
                "system",
                """Great, please provide me with a job desctiption and I will generate a resume from this template: {template}.""",
            ),
            ("user", "Awesome! Here are the job details:\n{job}"),
        ]
    )
    chain = generation_template | llm | str_output_parser
    return chain.invoke({"profile": profile, "job": job, "template": template})
