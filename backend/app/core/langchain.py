# Path: app.core.langchain.py

"""
Client for interacting with the Langchain API.
"""
import httpx
from bs4 import BeautifulSoup
from langchain_community.document_loaders import AsyncChromiumLoader
from langchain_community.document_transformers import BeautifulSoupTransformer
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from playwright.async_api import Error as PlaywrightError

from app.core import conf
from app.logging import get_logger
from app.utils import clean_text

llm = conf.openai.get_model()
logger = get_logger(__name__)

str_output_parser = StrOutputParser()


def _should_fallback_to_http_fetch(exc: PlaywrightError) -> bool:
    message = str(exc).lower()
    return any(
        marker in message
        for marker in (
            "executable doesn't exist",
            "playwright install",
            "host system is missing dependencies",
        )
    )


async def _extract_text_with_httpx(url: str) -> str:
    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=httpx.Timeout(30.0),
        headers={
            # Keep a desktop browser UA for sites that block default httpx requests.
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/123.0.0.0 Safari/537.36"
            )
        },
    ) as client:
        response = await client.get(url)
        response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    return clean_text(soup.get_text(" "))


async def extract_text_from_url(url: str) -> str:
    try:
        loader = AsyncChromiumLoader([url])
        transformer = BeautifulSoupTransformer()
        documents = await loader.aload()
        documents_transformed = transformer.transform_documents(documents)
        return documents_transformed[0].page_content
    except PlaywrightError as exc:
        if not _should_fallback_to_http_fetch(exc):
            raise

        logger.warning(
            "Playwright Chromium unavailable for %s, falling back to direct HTTP fetch: %s",
            url,
            exc,
        )
        return await _extract_text_with_httpx(url)


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
