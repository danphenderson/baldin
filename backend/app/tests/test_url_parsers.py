"""Tests for app.core.url_parsers – URL normalisation and profile parsing."""

from bs4 import BeautifulSoup

from app.core.url_parsers import (
    _collect_all_section_texts,
    _collect_section_texts,
    _is_handshake_profile,
    _is_linkedin_profile,
    _normalize_url,
    _parse_handshake_profile_html,
    _parse_linkedin_profile_html,
    _section_text,
)

# ---------------------------------------------------------------------------
# _normalize_url
# ---------------------------------------------------------------------------


def test_normalize_url_strips_tracking_params():
    url = "https://linkedin.com/in/jdoe?trk=abc&locale=en_US&utm_source=google"
    result = _normalize_url(url)
    assert "trk=" not in result
    assert "locale=" not in result
    assert "utm_source=" not in result


def test_normalize_url_keeps_non_tracking_params():
    url = "https://linkedin.com/in/jdoe?connectionId=abc&page=2"
    result = _normalize_url(url)
    assert "connectionId=abc" in result
    assert "page=2" in result


def test_normalize_url_no_params():
    url = "https://linkedin.com/in/jdoe"
    assert _normalize_url(url) == url


def test_normalize_url_strips_all_known_tracking():
    params = "trk=a&locale=b&utm_source=c&utm_medium=d&utm_campaign=e&utm_term=f&utm_content=g&originalSubdomain=h&miniProfileUrn=i&lipi=j"
    url = f"https://linkedin.com/in/jdoe?{params}"
    result = _normalize_url(url)
    assert result == "https://linkedin.com/in/jdoe"


# ---------------------------------------------------------------------------
# _is_linkedin_profile / _is_handshake_profile
# ---------------------------------------------------------------------------


def test_is_linkedin_profile_valid():
    assert _is_linkedin_profile("https://www.linkedin.com/in/john-doe") is True
    assert _is_linkedin_profile("https://linkedin.com/in/john-doe/") is True
    assert _is_linkedin_profile("http://linkedin.com/in/user_123") is True


def test_is_linkedin_profile_invalid():
    assert _is_linkedin_profile("https://linkedin.com/company/acme") is False
    assert _is_linkedin_profile("https://linkedin.com/jobs/view/123") is False
    assert _is_linkedin_profile("https://example.com/in/john-doe") is False


def test_is_handshake_profile_valid():
    assert _is_handshake_profile("https://app.joinhandshake.com/profiles/12345") is True
    assert _is_handshake_profile("https://joinhandshake.com/stu/users/67890/") is True
    assert _is_handshake_profile("http://app.joinhandshake.com/stu/users/111") is True


def test_is_handshake_profile_invalid():
    assert _is_handshake_profile("https://joinhandshake.com/employers/123") is False
    assert _is_handshake_profile("https://example.com/profiles/12345") is False


# ---------------------------------------------------------------------------
# _section_text
# ---------------------------------------------------------------------------


def test_section_text_none():
    assert _section_text(None) == ""


def test_section_text_extracts_cleaned_text():
    soup = BeautifulSoup("<div>  Hello   World  </div>", "html.parser")
    tag = soup.find("div")
    result = _section_text(tag)
    assert result == "Hello World"


# ---------------------------------------------------------------------------
# _collect_section_texts
# ---------------------------------------------------------------------------


def test_collect_section_texts_first_match():
    html = '<div><section class="about">About me</section><section class="exp">Experience</section></div>'
    soup = BeautifulSoup(html, "html.parser")
    result = _collect_section_texts(soup, ["section.about", "section.exp"])
    assert result == "About me"


def test_collect_section_texts_fallback():
    html = '<div><section class="exp">Experience</section></div>'
    soup = BeautifulSoup(html, "html.parser")
    result = _collect_section_texts(soup, ["section.about", "section.exp"])
    assert result == "Experience"


def test_collect_section_texts_no_match():
    soup = BeautifulSoup("<div>Nothing</div>", "html.parser")
    result = _collect_section_texts(soup, ["section.missing"])
    assert result == ""


# ---------------------------------------------------------------------------
# _collect_all_section_texts
# ---------------------------------------------------------------------------


def test_collect_all_section_texts():
    html = '<div class="item">A</div><div class="item">B</div>'
    soup = BeautifulSoup(html, "html.parser")
    result = _collect_all_section_texts(soup, ["div.item"])
    assert "A" in result
    assert "B" in result


def test_collect_all_section_texts_empty():
    soup = BeautifulSoup("<div>Nothing</div>", "html.parser")
    result = _collect_all_section_texts(soup, ["div.missing"])
    assert result == ""


# ---------------------------------------------------------------------------
# _parse_linkedin_profile_html
# ---------------------------------------------------------------------------


def test_parse_linkedin_profile_html_with_sections():
    html = """
    <html>
    <section class="pv-top-card">John Doe - Software Engineer</section>
    <section class="pv-about-section">Passionate about building things.</section>
    <section class="experience-section">
        <div>Eng at Acme Corp</div>
        <div>Dev at Beta Inc</div>
    </section>
    <section class="education-section">BS Computer Science</section>
    </html>
    """
    result = _parse_linkedin_profile_html(html)
    assert "## Profile" in result
    assert "John Doe" in result
    assert "## About" in result
    assert "## Experience" in result
    assert "## Education" in result


def test_parse_linkedin_profile_html_fallback():
    html = "<html><body>Just plain text content here</body></html>"
    result = _parse_linkedin_profile_html(html)
    assert "Just plain text content here" in result


# ---------------------------------------------------------------------------
# _parse_handshake_profile_html
# ---------------------------------------------------------------------------


def test_parse_handshake_profile_html_with_sections():
    html = """
    <html>
    <div data-hook="profile-header">Jane Smith</div>
    <div data-hook="about-section">Looking for opportunities.</div>
    <div data-hook="work-experience-section">Intern at Gamma LLC</div>
    <div data-hook="education-section">MIT, 2024</div>
    <div data-hook="skills-section">Python, SQL</div>
    </html>
    """
    result = _parse_handshake_profile_html(html)
    assert "## Profile" in result
    assert "Jane Smith" in result
    assert "## About" in result
    assert "## Experience" in result
    assert "## Education" in result
    assert "## Skills" in result


def test_parse_handshake_profile_html_fallback():
    html = "<html><body>Plain content fallback</body></html>"
    result = _parse_handshake_profile_html(html)
    assert "Plain content fallback" in result
