import socket

import httpx
import pytest

from app.core import langchain
from app.core.url_safety import UnsafeFetchUrlError, validate_url_safe_for_fetch


def test_validate_url_safe_for_fetch_rejects_non_http_scheme() -> None:
    with pytest.raises(UnsafeFetchUrlError, match="http or https"):
        validate_url_safe_for_fetch("ftp://example.com/resume")


def test_validate_url_safe_for_fetch_rejects_literal_private_ip() -> None:
    with pytest.raises(UnsafeFetchUrlError, match="non-public IP"):
        validate_url_safe_for_fetch("http://127.0.0.1/private")


def test_validate_url_safe_for_fetch_rejects_private_dns_resolution(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fake_getaddrinfo(host, port, type, proto):
        assert host == "internal.example.com"
        return [
            (
                socket.AF_INET,
                socket.SOCK_STREAM,
                socket.IPPROTO_TCP,
                "",
                ("10.0.0.8", port),
            )
        ]

    monkeypatch.setattr(socket, "getaddrinfo", fake_getaddrinfo)

    with pytest.raises(UnsafeFetchUrlError, match="non-public IP"):
        validate_url_safe_for_fetch("https://internal.example.com/profile")


def test_validate_url_safe_for_fetch_allows_public_dns_resolution(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fake_getaddrinfo(host, port, type, proto):
        assert host == "example.com"
        return [
            (
                socket.AF_INET,
                socket.SOCK_STREAM,
                socket.IPPROTO_TCP,
                "",
                ("93.184.216.34", port),
            )
        ]

    monkeypatch.setattr(socket, "getaddrinfo", fake_getaddrinfo)

    assert (
        validate_url_safe_for_fetch("https://example.com/resume")
        == "https://example.com/resume"
    )


def test_validate_url_safe_for_fetch_rejects_dns_resolution_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fake_getaddrinfo(host, port, type, proto):
        assert host == "example.com"
        raise socket.gaierror(socket.EAI_AGAIN, "temporary failure")

    monkeypatch.setattr(socket, "getaddrinfo", fake_getaddrinfo)

    with pytest.raises(UnsafeFetchUrlError, match="could not be resolved"):
        validate_url_safe_for_fetch("https://example.com/resume")


def test_validate_url_safe_for_fetch_rejects_empty_dns_resolution(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fake_getaddrinfo(host, port, type, proto):
        assert host == "example.com"
        return []

    monkeypatch.setattr(socket, "getaddrinfo", fake_getaddrinfo)

    with pytest.raises(
        UnsafeFetchUrlError,
        match="did not resolve to any IP addresses",
    ):
        validate_url_safe_for_fetch("https://example.com/resume")


@pytest.mark.asyncio
async def test_extract_text_from_url_rejects_unsafe_url_before_browser_loader(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fail_playwright_context(*args, **kwargs):
        raise AssertionError("Playwright should not be started for an unsafe URL")

    monkeypatch.setattr(langchain, "async_playwright", fail_playwright_context)

    with pytest.raises(UnsafeFetchUrlError, match="non-public IP"):
        await langchain.extract_text_from_url("http://127.0.0.1/private")


@pytest.mark.asyncio
async def test_extract_text_with_httpx_rejects_unsafe_url_before_http_client(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class FailAsyncClient:
        def __init__(self, *args, **kwargs) -> None:
            raise AssertionError("httpx AsyncClient should not be constructed")

    monkeypatch.setattr(langchain.httpx, "AsyncClient", FailAsyncClient)

    with pytest.raises(UnsafeFetchUrlError, match="non-public IP"):
        await langchain._extract_text_with_httpx("http://127.0.0.1/private")


@pytest.mark.asyncio
async def test_extract_text_with_httpx_rejects_private_redirect_target(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fake_getaddrinfo(host, port, type, proto):
        assert host == "example.com"
        return [
            (
                socket.AF_INET,
                socket.SOCK_STREAM,
                socket.IPPROTO_TCP,
                "",
                ("93.184.216.34", port),
            )
        ]

    class FakeAsyncClient:
        def __init__(self, *args, **kwargs) -> None:
            self.calls: list[str] = []

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb) -> None:
            return None

        async def get(self, url: str):
            self.calls.append(url)
            if len(self.calls) > 1:
                raise AssertionError("Unsafe redirect target should not be requested")
            return httpx.Response(
                302,
                headers={"location": "http://127.0.0.1/internal"},
                request=httpx.Request("GET", url),
            )

    monkeypatch.setattr(socket, "getaddrinfo", fake_getaddrinfo)
    monkeypatch.setattr(langchain.httpx, "AsyncClient", FakeAsyncClient)

    with pytest.raises(UnsafeFetchUrlError, match="non-public IP"):
        await langchain._extract_text_with_httpx("https://example.com/start")


@pytest.mark.asyncio
async def test_extract_text_from_url_rejects_private_redirect_target_in_browser(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fake_getaddrinfo(host, port, type, proto):
        assert host == "example.com"
        return [
            (
                socket.AF_INET,
                socket.SOCK_STREAM,
                socket.IPPROTO_TCP,
                "",
                ("93.184.216.34", port),
            )
        ]

    class FakeRequest:
        def __init__(self, url: str) -> None:
            self.url = url

        def is_navigation_request(self) -> bool:
            return True

    class FakeRoute:
        def __init__(self, url: str) -> None:
            self.request = FakeRequest(url)
            self.abort_reason: str | None = None
            self.continued = False

        async def abort(self, reason: str) -> None:
            self.abort_reason = reason

        async def continue_(self) -> None:
            self.continued = True

    class FakePage:
        def __init__(self) -> None:
            self.route_handler = None

        async def route(self, pattern: str, handler) -> None:
            self.route_handler = handler

        async def goto(self, url: str) -> None:
            initial_route = FakeRoute(url)
            await self.route_handler(initial_route)
            assert initial_route.continued is True
            assert initial_route.abort_reason is None

            redirect_route = FakeRoute("http://127.0.0.1/internal")
            await self.route_handler(redirect_route)
            assert redirect_route.abort_reason == "blockedbyclient"
            raise langchain.PlaywrightError("net::ERR_BLOCKED_BY_CLIENT")

        async def content(self) -> str:
            raise AssertionError("Blocked redirects should not reach page.content")

    class FakeBrowser:
        async def new_page(self, user_agent: str | None = None):
            return FakePage()

        async def close(self) -> None:
            return None

    class FakeChromium:
        async def launch(self, headless: bool = True):
            return FakeBrowser()

    class FakePlaywright:
        def __init__(self) -> None:
            self.chromium = FakeChromium()

    class FakeAsyncPlaywrightContext:
        async def __aenter__(self):
            return FakePlaywright()

        async def __aexit__(self, exc_type, exc, tb) -> None:
            return None

    monkeypatch.setattr(socket, "getaddrinfo", fake_getaddrinfo)
    monkeypatch.setattr(
        langchain,
        "async_playwright",
        lambda: FakeAsyncPlaywrightContext(),
    )

    with pytest.raises(UnsafeFetchUrlError, match="redirect target"):
        await langchain.extract_text_from_url("https://example.com/start")
