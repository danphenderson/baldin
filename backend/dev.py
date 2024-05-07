#!/usr/bin/env python
# Path: backend/dev.py
"""
A module to assist in development of the app.

This module utilizes the apps configuration settings and openai
API access to perform various tasks, e.g.
- Q/A chatbot
- Third-party Documentation search
- Generate code snippets
- Generate synthetic seed data
"""
from pathlib import Path

from langchain_community.document_loaders import AsyncChromiumLoader, AsyncHtmlLoader
from langchain_community.document_transformers import BeautifulSoupTransformer
from rich import print
from typer import Typer

from app.core.langchain import ChatPromptTemplate, llm, str_output_parser
from app.logging import get_logger

app = Typer(help="Developer on the balden backend Python applications.")

logger = get_logger("devcli")


@app.command()
def code(problem: str, context: str = "", language: str = "Python") -> str:

    # see if context is a module in app/
    python_modles = Path("app").rglob("*.py")
    context_msg = ""
    context_list = context.split(',')
    for module in python_modles:
        for context in context_list:
            if context.strip() in str(module):
                with open(module, "r") as f:
                    context_msg += f.read()
                break

    generation_template = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "Hi, you are a helpful {language} backend web developer working on project baldin.",
            ),
            (
                "user",
                "Using {language} best practices, you will assist as a co-pilot, generating code for project baldin.",
            ),
            (
                "ai",
                "Great, provide me with a problem and I will begin generating a solution.",
            ),
            ("user", "Problem:\\n\\n{problem}"),
            (
                "ai",
                "Great, can you provide me with some context to help me generate a solution?",
            ),
            ("user", "Context:\\n\\n{context_msg}"),
            (
                "ai",
                "Great, I will consider the problem and context and generate a solution. Please wait.",
            ),
            (
                "user",
                "Thank you, please provide me with an overview of your reasoning and the generated code.",
            ),
        ]
    )

    chain = generation_template | llm | str_output_parser
    res = chain.invoke(
        {"language": language, "problem": problem, "context_msg": context_msg}
    )
    print(res)
    return res


@app.command()
def qa(question: str, context: str = "") -> str:
    human_message = f"Hello, answer the following question:\\n{question}"
    if context:
        human_message += f"Answer the question with this as your context\\n{context}"
    generation_template = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are a helpful AI assistant that helps users answer questions.",
            ),
            ("user", "Hello, answer the following question:\\n{question}"),
        ]
    )
    chain = generation_template | llm | str_output_parser
    return chain.invoke({"question": question})


async def bs_find(query: str, url: str) -> str:
    async with AsyncHtmlLoader(url) as loader:
        html = await loader.load()
    soup = BeautifulSoupTransformer(html)
    return soup.find(query) | str_output_parser


async def find(query: str, url: str) -> str:
    async with AsyncChromiumLoader(url) as loader:
        html = await loader.load()
    return html.find(query) | str_output_parser


async def docs_codegen(problem, docs_url):
    ...


async def docs_qa(question, docs_url):
    ...


if __name__ == "__main__":
    app()
