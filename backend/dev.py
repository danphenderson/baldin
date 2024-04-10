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
from langchain_community.document_loaders import AsyncChromiumLoader, async_html
from langchain_community.document_transformers import BeautifulSoupTransformer
from typer import Argument, Typer

from app.core.langchain import ChatPromptTemplate, llm, str_output_parser
from app.logging import get_logger

app = Typer()

logger = get_logger("devcli", file_name="devcli")


@app.command()
def codegen(problem: str, language: str = "Python", context: str = "") -> str:
    human_message = f"Hello, generate a code snippet in {language} for the following problem:\\n{problem}"
    if context:
        human_message += (
            f"Generate a solution to the problem with this as your context\\n{context}"
        )
    generation_template = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are a helpful AI assistant software engineer that helps users generate code snippets for web development.",
            ),
            (
                "user",
                "Hello, generate a code snippet in {language} for the following problem:\\n {problem}",
            ),
        ]
    )
    chain = generation_template | llm | str_output_parser
    return chain.invoke({"language": language, "problem": problem})


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


@app.command
async def bs_search(query: str, url: str) -> str:
    loader = AsyncChromiumLoader()


def main():
    app()


if __name__ == "__main__":
    main()
