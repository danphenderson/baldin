# Path: app.core.langchain.py

"""
Client for interacting with the Langchain API.
"""
import httpx
from bs4 import BeautifulSoup
from langchain_community.document_transformers import BeautifulSoupTransformer
from langchain_core.documents import Document
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_text_splitters import RecursiveCharacterTextSplitter
from playwright.async_api import Error as PlaywrightError
from playwright.async_api import async_playwright

from app.core import conf
from app.core.url_safety import (
    UnsafeFetchUrlError,
    validate_redirect_target_for_fetch,
    validate_url_safe_for_fetch,
)
from app.logging import get_logger
from app.utils import clean_text

llm = conf.openai.get_model()
logger = get_logger(__name__)

str_output_parser = StrOutputParser()

_FETCH_HEADERS = {
    # Keep a desktop browser UA for sites that block default requests.
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/123.0.0.0 Safari/537.36"
    )
}
_MAX_REDIRECT_HOPS = 10


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
    safe_url = validate_url_safe_for_fetch(url)

    async with _build_httpx_client() as client:
        response = await _get_with_safe_redirects(client, safe_url)
        response.raise_for_status()
        response_text = response.text
        await response.aclose()

    soup = BeautifulSoup(response_text, "html.parser")
    return clean_text(soup.get_text(" "))


def _build_httpx_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(
        follow_redirects=False,
        timeout=httpx.Timeout(30.0),
        headers=_FETCH_HEADERS,
    )


async def _get_with_safe_redirects(
    client: httpx.AsyncClient,
    url: str,
) -> httpx.Response:
    current_url = validate_url_safe_for_fetch(url)
    redirect_count = 0

    while True:
        response = await client.get(current_url)
        if not response.is_redirect:
            return response

        try:
            current_url = validate_redirect_target_for_fetch(
                str(response.url),
                response.headers.get("location"),
            )
        finally:
            await response.aclose()

        redirect_count += 1
        if redirect_count > _MAX_REDIRECT_HOPS:
            raise UnsafeFetchUrlError(
                f"Fetch URL exceeded redirect limit of {_MAX_REDIRECT_HOPS} hops"
            )


def _transform_html_to_text(url: str, html: str) -> str:
    transformer = BeautifulSoupTransformer()
    documents = transformer.transform_documents(
        [Document(page_content=html, metadata={"source": url})]
    )
    return documents[0].page_content


async def _extract_text_with_playwright(url: str) -> str:
    safe_url = validate_url_safe_for_fetch(url)
    blocked_navigation_url: str | None = None

    async def _guard_navigation_requests(route) -> None:
        nonlocal blocked_navigation_url

        request = route.request
        if not request.is_navigation_request():
            await route.continue_()
            return

        try:
            validate_url_safe_for_fetch(request.url)
        except UnsafeFetchUrlError:
            blocked_navigation_url = request.url
            await route.abort("blockedbyclient")
            return

        await route.continue_()

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        try:
            page = await browser.new_page(user_agent=_FETCH_HEADERS["User-Agent"])
            await page.route("**/*", _guard_navigation_requests)
            try:
                await page.goto(safe_url)
            except PlaywrightError as exc:
                if blocked_navigation_url is not None:
                    raise UnsafeFetchUrlError(
                        f"Fetch URL redirect target '{blocked_navigation_url}' is unsafe"
                    ) from exc
                raise

            html = await page.content()
        finally:
            await browser.close()

    return _transform_html_to_text(safe_url, html)


async def extract_text_from_url(url: str) -> str:
    safe_url = validate_url_safe_for_fetch(url)

    try:
        return await _extract_text_with_playwright(safe_url)
    except PlaywrightError as exc:
        if not _should_fallback_to_http_fetch(exc):
            raise

        logger.warning(
            "Playwright Chromium unavailable for %s, falling back to direct HTTP fetch: %s",
            safe_url,
            exc,
        )
        return await _extract_text_with_httpx(safe_url)


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


# ---------------------------------------------------------------------------
#  Text chunking helpers
# ---------------------------------------------------------------------------

_text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=200,
    length_function=len,
    separators=["\n\n", "\n", ". ", " ", ""],
)


def chunk_text(text: str) -> list[str]:
    """Split *text* into overlapping chunks suitable for embedding."""
    if not text or not text.strip():
        return []
    return _text_splitter.split_text(text)


# ---------------------------------------------------------------------------
#  RAG chains
# ---------------------------------------------------------------------------


def enrich_lead(lead_description: str, context_chunks: list[str]) -> str:
    """Enrich a lead description using relevant document context."""
    context = "\n---\n".join(context_chunks)
    template = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are a career research assistant. Use the provided context "
                "from the user's documents to enrich and analyze the following "
                "job lead. Highlight key qualifications the user already has, "
                "gaps to address, and actionable next steps.",
            ),
            (
                "user",
                "Context from my documents:\n{context}\n\n"
                "Job lead details:\n{lead_description}",
            ),
        ]
    )
    chain = template | llm | str_output_parser
    return chain.invoke(
        {"context": context, "lead_description": lead_description},
    )


def generate_cover_letter_rag(
    profile: str,
    job: str,
    template: str,
    context_chunks: list[str],
) -> str:
    """Generate a cover letter using RAG context from user documents."""
    context = "\n---\n".join(context_chunks)
    generation_template = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are a helpful AI assistant that generates cover letters. "
                "Use the additional context from the user's documents to tailor "
                "the letter to their specific background and achievements.",
            ),
            (
                "user",
                "My background: {profile}\n\n"
                "Additional context from my documents:\n{context}",
            ),
            (
                "system",
                "Generate a cover letter from this template: {template}",
            ),
            ("user", "Here are the job details:\n{job}"),
        ]
    )
    chain = generation_template | llm | str_output_parser
    return chain.invoke(
        {"profile": profile, "job": job, "template": template, "context": context},
    )


def generate_resume_rag(
    profile: str,
    job: str,
    template: str,
    context_chunks: list[str],
) -> str:
    """Generate a resume using RAG context from user documents."""
    context = "\n---\n".join(context_chunks)
    generation_template = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are a helpful AI assistant that generates resumes. "
                "Use the additional context from the user's documents to tailor "
                "the resume to their specific background, skills, and achievements.",
            ),
            (
                "user",
                "My background: {profile}\n\n"
                "Additional context from my documents:\n{context}",
            ),
            (
                "system",
                "Generate a resume from this template: {template}",
            ),
            ("user", "Here are the job details:\n{job}"),
        ]
    )
    chain = generation_template | llm | str_output_parser
    return chain.invoke(
        {"profile": profile, "job": job, "template": template, "context": context},
    )


def rank_leads(
    leads: list[dict],
    context_chunks: list[str],
) -> str:
    """Rank a list of leads by relevance to the user's profile and documents."""
    context = "\n---\n".join(context_chunks)
    leads_text = "\n\n".join(
        f"Lead {i + 1}: {lead.get('title', 'Untitled')} — {lead.get('description', '')}"
        for i, lead in enumerate(leads)
    )
    template = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are a career advisor. Rank the following job leads from "
                "most to least relevant based on the user's background documents. "
                "For each lead, provide a relevance score (1-10) and a brief "
                "explanation. Return the results as a structured list.",
            ),
            (
                "user",
                "Context from my documents:\n{context}\n\n"
                "Job leads to rank:\n{leads_text}",
            ),
        ]
    )
    chain = template | llm | str_output_parser
    return chain.invoke({"context": context, "leads_text": leads_text})


def summarize_company_website(url: str, page_text: str) -> str:
    """Summarize a company website page for lead research."""
    template = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are a company research assistant. Summarize the following "
                "company website content. Focus on: company mission, products/"
                "services, culture, recent news, and potential job opportunities. "
                "Be concise but thorough.",
            ),
            (
                "user",
                "Website URL: {url}\n\nPage content:\n{page_text}",
            ),
        ]
    )
    chain = template | llm | str_output_parser
    return chain.invoke({"url": url, "page_text": page_text})
