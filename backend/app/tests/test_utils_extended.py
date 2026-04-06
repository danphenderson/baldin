"""Extended tests for app.utils – pure-function coverage."""

import pytest
from bs4 import BeautifulSoup
from pydantic import ValidationError

from app.schemas import ExtractorRequest
from app.utils import (
    _is_tracking_query_param,
    _rm_titles,
    _sorted_query_items,
    build_user_display_name,
    canonicalize_lead_url,
    compute_version_hash,
    extract_json,
    extract_soup_hrefs,
    generate_resources,
    split_soup_lines,
    validate_json_schema,
)


# ---------------------------------------------------------------------------
# build_user_display_name
# ---------------------------------------------------------------------------


class _FakeUser:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)


def test_display_name_first_and_last():
    user = _FakeUser(first_name="Alice", last_name="Smith", email="a@b.com", id=1)
    assert build_user_display_name(user) == "Alice Smith"


def test_display_name_first_only():
    user = _FakeUser(first_name="Alice", last_name=None, email="a@b.com", id=1)
    assert build_user_display_name(user) == "Alice"


def test_display_name_falls_back_to_email():
    user = _FakeUser(first_name=None, last_name=None, email="a@b.com", id=1)
    assert build_user_display_name(user) == "a@b.com"


def test_display_name_falls_back_to_id():
    user = _FakeUser(first_name=None, last_name=None, email="", id=42)
    assert build_user_display_name(user) == "42"


def test_display_name_missing_attrs():
    user = object()
    assert build_user_display_name(user) == ""


# ---------------------------------------------------------------------------
# compute_version_hash
# ---------------------------------------------------------------------------


def test_compute_version_hash_deterministic():
    h1 = compute_version_hash("instruct", {"a": 1})
    h2 = compute_version_hash("instruct", {"a": 1})
    assert h1 == h2


def test_compute_version_hash_none_inputs():
    h = compute_version_hash(None, None)
    assert isinstance(h, str) and len(h) == 64


def test_compute_version_hash_different_inputs():
    h1 = compute_version_hash("a", {"x": 1})
    h2 = compute_version_hash("b", {"x": 1})
    assert h1 != h2


# ---------------------------------------------------------------------------
# _is_tracking_query_param / _sorted_query_items
# ---------------------------------------------------------------------------


def test_tracking_param_utm():
    assert _is_tracking_query_param("utm_source") is True
    assert _is_tracking_query_param("UTM_CAMPAIGN") is True


def test_tracking_param_known():
    assert _is_tracking_query_param("fbclid") is True
    assert _is_tracking_query_param("trk") is True


def test_non_tracking_param():
    assert _is_tracking_query_param("page") is False
    assert _is_tracking_query_param("q") is False


def test_sorted_query_items():
    items = [("z", "1"), ("a", "2"), ("m", "3")]
    assert _sorted_query_items(items) == [("a", "2"), ("m", "3"), ("z", "1")]


# ---------------------------------------------------------------------------
# canonicalize_lead_url
# ---------------------------------------------------------------------------


def test_canonicalize_strips_whitespace():
    assert canonicalize_lead_url("  https://example.com  ") == "https://example.com/"


def test_canonicalize_lowercases_scheme_and_host():
    assert (
        canonicalize_lead_url("HTTPS://EXAMPLE.COM/Path") == "https://example.com/Path"
    )


def test_canonicalize_strips_www():
    assert (
        canonicalize_lead_url("https://www.example.com/page")
        == "https://example.com/page"
    )


def test_canonicalize_strips_default_port():
    assert (
        canonicalize_lead_url("https://example.com:443/page")
        == "https://example.com/page"
    )
    assert (
        canonicalize_lead_url("http://example.com:80/page") == "http://example.com/page"
    )


def test_canonicalize_keeps_non_default_port():
    assert (
        canonicalize_lead_url("https://example.com:8443/page")
        == "https://example.com:8443/page"
    )


def test_canonicalize_strips_trailing_slash():
    assert (
        canonicalize_lead_url("https://example.com/page/") == "https://example.com/page"
    )


def test_canonicalize_collapses_double_slashes():
    assert (
        canonicalize_lead_url("https://example.com//page//sub")
        == "https://example.com/page/sub"
    )


def test_canonicalize_strips_tracking_params():
    url = "https://example.com/page?q=test&utm_source=google&fbclid=abc"
    assert canonicalize_lead_url(url) == "https://example.com/page?q=test"


def test_canonicalize_sorts_query_params():
    url = "https://example.com/page?z=1&a=2"
    assert canonicalize_lead_url(url) == "https://example.com/page?a=2&z=1"


def test_canonicalize_rejects_non_http():
    with pytest.raises(ValueError, match="http or https"):
        canonicalize_lead_url("ftp://example.com")


def test_canonicalize_rejects_missing_host():
    with pytest.raises(ValueError, match="must include a host"):
        canonicalize_lead_url("https://")


def test_canonicalize_root_path():
    assert canonicalize_lead_url("https://example.com") == "https://example.com/"


# ---------------------------------------------------------------------------
# split_soup_lines / extract_soup_hrefs
# ---------------------------------------------------------------------------


def test_split_soup_lines():
    html = "<p>Hello</p>\n<p>World</p>"
    soup = BeautifulSoup(html, "html.parser")
    assert split_soup_lines(soup) == ["Hello", "World"]


def test_split_soup_lines_strips_blanks():
    html = "<p>Hello</p>\n\n\n<p>World</p>"
    soup = BeautifulSoup(html, "html.parser")
    lines = split_soup_lines(soup)
    assert "" not in lines


def test_extract_soup_hrefs():
    html = '<a href="http://a.com">A</a><a href="http://b.com">B</a><a>No href</a>'
    soup = BeautifulSoup(html, "html.parser")
    assert extract_soup_hrefs(soup) == ["http://a.com", "http://b.com"]


# ---------------------------------------------------------------------------
# extract_json
# ---------------------------------------------------------------------------


def test_extract_json_single_block():
    text = 'Here is data:\n```json\n{"key": "value"}\n```\nDone.'
    result = extract_json(text)
    assert result == [{"key": "value"}]


def test_extract_json_multiple_blocks():
    text = '```json\n{"a": 1}\n```\nMore\n```json\n{"b": 2}\n```'
    result = extract_json(text)
    assert result == [{"a": 1}, {"b": 2}]


def test_extract_json_no_blocks():
    assert extract_json("no json here") == []


def test_extract_json_invalid_raises():
    with pytest.raises(ValueError, match="Failed to parse"):
        extract_json("```json\nnot-valid-json\n```")


# ---------------------------------------------------------------------------
# _rm_titles
# ---------------------------------------------------------------------------


def test_rm_titles_removes_title_key():
    result = _rm_titles({"title": "T", "name": "N"})
    assert result == {"name": "N"}


def test_rm_titles_recursive():
    result = _rm_titles({"outer": {"title": "T", "inner": "V"}})
    assert result == {"outer": {"inner": "V"}}


def test_rm_titles_no_titles():
    d = {"a": 1, "b": "two"}
    assert _rm_titles(d) == d


# ---------------------------------------------------------------------------
# validate_json_schema
# ---------------------------------------------------------------------------


def test_validate_json_schema_valid():
    schema = {"type": "object", "properties": {"name": {"type": "string"}}}
    validate_json_schema(schema)  # should not raise


def test_validate_json_schema_invalid():
    schema = {"type": "not-a-type"}
    with pytest.raises(ValueError, match="Invalid schema"):
        validate_json_schema(schema)


def test_extractor_request_invalid_schema_surfaces_validation_error():
    with pytest.raises(ValidationError, match="Invalid schema"):
        ExtractorRequest(schema={"type": "not-a-type"})


# ---------------------------------------------------------------------------
# generate_resources
# ---------------------------------------------------------------------------


def test_generate_resources_single_file(tmp_path):
    f = tmp_path / "doc.pdf"
    f.write_bytes(b"dummy")
    result = generate_resources(f)
    assert result == [f]


def test_generate_resources_directory(tmp_path):
    (tmp_path / "a.pdf").write_bytes(b"a")
    (tmp_path / "b.pdf").write_bytes(b"b")
    (tmp_path / "c.txt").write_bytes(b"c")
    result = generate_resources(tmp_path)
    names = sorted(p.name for p in result)
    assert names == ["a.pdf", "b.pdf"]
