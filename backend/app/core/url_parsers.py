"""
Domain-aware URL parsing for profile extraction.

Dispatches LinkedIn and Handshake profile URLs to targeted BeautifulSoup
parsers that extract structured sections, yielding much cleaner input for
downstream LLM extractors. Unknown domains fall through to the generic
``extract_text_from_url`` path.
"""

from __future__ import annotations

import re
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from bs4 import BeautifulSoup, Tag

from app.core.langchain import extract_text_from_url
from app.logging import get_logger
from app.utils import clean_text

logger = get_logger(__name__)

# ---------------------------------------------------------------------------
# URL normalisation helpers
# ---------------------------------------------------------------------------

_TRACKING_PARAMS = frozenset(
    {
        "trk",
        "locale",
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_term",
        "utm_content",
        "originalSubdomain",
        "miniProfileUrn",
        "lipi",
    }
)


def _normalize_url(url: str) -> str:
    """Strip common tracking / noise query params and normalize."""
    parsed = urlparse(url)
    qs = parse_qs(parsed.query, keep_blank_values=False)
    cleaned = {k: v for k, v in qs.items() if k not in _TRACKING_PARAMS}
    return urlunparse(parsed._replace(query=urlencode(cleaned, doseq=True)))


# ---------------------------------------------------------------------------
# Domain detection
# ---------------------------------------------------------------------------

_LINKEDIN_PROFILE_RE = re.compile(
    r"^https?://(www\.)?linkedin\.com/in/[A-Za-z0-9_-]+/?",
)
_HANDSHAKE_PROFILE_RE = re.compile(
    r"^https?://(app\.)?joinhandshake\.com/(profiles|stu/users)/\d+/?",
)


def _is_linkedin_profile(url: str) -> bool:
    return _LINKEDIN_PROFILE_RE.match(url) is not None


def _is_handshake_profile(url: str) -> bool:
    return _HANDSHAKE_PROFILE_RE.match(url) is not None


# ---------------------------------------------------------------------------
# Section text helpers
# ---------------------------------------------------------------------------


def _section_text(tag: Tag | None) -> str:
    """Get cleaned visible text from a BS4 tag, or empty string."""
    if tag is None:
        return ""
    return clean_text(tag.get_text(" ", strip=True))


def _collect_section_texts(
    soup: BeautifulSoup,
    selectors: list[str],
) -> str:
    """Try each CSS selector in order, return the first non-empty match."""
    for sel in selectors:
        tag = soup.select_one(sel)
        if tag:
            text = _section_text(tag)
            if text:
                return text
    return ""


def _collect_all_section_texts(
    soup: BeautifulSoup,
    selectors: list[str],
) -> str:
    """Collect text from ALL matching elements across selectors."""
    parts: list[str] = []
    for sel in selectors:
        for tag in soup.select(sel):
            text = _section_text(tag)
            if text:
                parts.append(text)
    return "\n".join(parts)


# ---------------------------------------------------------------------------
# LinkedIn profile parser
# ---------------------------------------------------------------------------

# LinkedIn profile section selectors (ordered by likelihood — modern → legacy)
_LI_ABOUT_SELECTORS = [
    "section.pv-about-section",
    "#about ~ .display-flex",
    "section:has(> #about)",
    '[data-section="summary"]',
]
_LI_EXPERIENCE_SELECTORS = [
    "section.experience-section",
    "#experience ~ .pvs-list__container",
    "#experience ~ div",
    "section:has(> #experience)",
    '[data-section="experience"]',
]
_LI_EDUCATION_SELECTORS = [
    "section.education-section",
    "#education ~ .pvs-list__container",
    "#education ~ div",
    "section:has(> #education)",
    '[data-section="education"]',
]
_LI_SKILLS_SELECTORS = [
    "section.pv-skill-categories-section",
    "#skills ~ .pvs-list__container",
    "#skills ~ div",
    "section:has(> #skills)",
    '[data-section="skills"]',
]
_LI_CERTIFICATIONS_SELECTORS = [
    "#licenses_and_certifications ~ .pvs-list__container",
    "#licenses_and_certifications ~ div",
    "section:has(> #licenses_and_certifications)",
]
_LI_HEADER_SELECTORS = [
    "section.pv-top-card",
    ".pv-text-details--left-aligned",
    "div.ph5 .mt2",
]


def _parse_linkedin_profile_html(raw_html: str) -> str:
    """Extract structured sections from LinkedIn profile HTML."""
    soup = BeautifulSoup(raw_html, "html.parser")

    sections: list[str] = []

    # Header / identity
    header = _collect_section_texts(soup, _LI_HEADER_SELECTORS)
    if header:
        sections.append(f"## Profile\n{header}")

    # About / summary
    about = _collect_section_texts(soup, _LI_ABOUT_SELECTORS)
    if about:
        sections.append(f"## About\n{about}")

    # Experience
    exp = _collect_all_section_texts(soup, _LI_EXPERIENCE_SELECTORS)
    if exp:
        sections.append(f"## Experience\n{exp}")

    # Education
    edu = _collect_all_section_texts(soup, _LI_EDUCATION_SELECTORS)
    if edu:
        sections.append(f"## Education\n{edu}")

    # Skills
    skills = _collect_all_section_texts(soup, _LI_SKILLS_SELECTORS)
    if skills:
        sections.append(f"## Skills\n{skills}")

    # Certifications
    certs = _collect_all_section_texts(soup, _LI_CERTIFICATIONS_SELECTORS)
    if certs:
        sections.append(f"## Certifications\n{certs}")

    if sections:
        return "\n\n".join(sections)

    # Fallback: if selectors matched nothing, return raw cleaned text
    logger.info("LinkedIn selectors matched no sections, using full-page text fallback")
    return clean_text(soup.get_text(" ", strip=True))


# ---------------------------------------------------------------------------
# Handshake profile parser
# ---------------------------------------------------------------------------

_HS_ABOUT_SELECTORS = [
    '[data-hook="about-section"]',
    ".about-section",
    ".profile-about",
]
_HS_EXPERIENCE_SELECTORS = [
    '[data-hook="work-experience-section"]',
    ".work-experience-section",
    ".profile-experience",
]
_HS_EDUCATION_SELECTORS = [
    '[data-hook="education-section"]',
    ".education-section",
    ".profile-education",
]
_HS_SKILLS_SELECTORS = [
    '[data-hook="skills-section"]',
    ".skills-section",
    ".profile-skills",
]
_HS_HEADER_SELECTORS = [
    '[data-hook="profile-header"]',
    ".profile-header",
    ".student-header",
]


def _parse_handshake_profile_html(raw_html: str) -> str:
    """Extract structured sections from Handshake profile HTML."""
    soup = BeautifulSoup(raw_html, "html.parser")

    sections: list[str] = []

    header = _collect_section_texts(soup, _HS_HEADER_SELECTORS)
    if header:
        sections.append(f"## Profile\n{header}")

    about = _collect_section_texts(soup, _HS_ABOUT_SELECTORS)
    if about:
        sections.append(f"## About\n{about}")

    exp = _collect_all_section_texts(soup, _HS_EXPERIENCE_SELECTORS)
    if exp:
        sections.append(f"## Experience\n{exp}")

    edu = _collect_all_section_texts(soup, _HS_EDUCATION_SELECTORS)
    if edu:
        sections.append(f"## Education\n{edu}")

    skills = _collect_all_section_texts(soup, _HS_SKILLS_SELECTORS)
    if skills:
        sections.append(f"## Skills\n{skills}")

    if sections:
        return "\n\n".join(sections)

    logger.info(
        "Handshake selectors matched no sections, using full-page text fallback"
    )
    return clean_text(soup.get_text(" ", strip=True))


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def extract_text_from_url_smart(url: str) -> str:
    """Domain-aware URL text extraction.

    LinkedIn and Handshake profile URLs are fetched and then parsed with
    targeted BeautifulSoup selectors to produce section-headed text.
    All other URLs fall through to the generic ``extract_text_from_url``.
    """
    normalized = _normalize_url(url)

    if _is_linkedin_profile(normalized):
        logger.info("Detected LinkedIn profile URL: %s", normalized)
        raw = await extract_text_from_url(normalized)
        return _parse_linkedin_profile_html(raw)

    if _is_handshake_profile(normalized):
        logger.info("Detected Handshake profile URL: %s", normalized)
        raw = await extract_text_from_url(normalized)
        return _parse_handshake_profile_html(raw)

    return await extract_text_from_url(normalized)
