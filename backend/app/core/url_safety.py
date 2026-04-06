"""Validation helpers for outbound URL fetching."""

from __future__ import annotations

import ipaddress
import socket
from urllib.parse import urljoin, urlsplit

ALLOWED_FETCH_SCHEMES = frozenset({"http", "https"})


class UnsafeFetchUrlError(ValueError):
    """Raised when a user-supplied URL is unsafe for outbound fetching."""


def _ensure_public_address(
    address: ipaddress.IPv4Address | ipaddress.IPv6Address,
    hostname: str,
) -> None:
    if address.is_global:
        return

    raise UnsafeFetchUrlError(
        f"Fetch URL host '{hostname}' resolves to a non-public IP address"
    )


def _resolve_hostname_addresses(
    hostname: str,
    port: int,
) -> set[ipaddress.IPv4Address | ipaddress.IPv6Address]:
    try:
        addrinfo = socket.getaddrinfo(
            hostname,
            port,
            type=socket.SOCK_STREAM,
            proto=socket.IPPROTO_TCP,
        )
    except socket.gaierror:
        return set()

    addresses: set[ipaddress.IPv4Address | ipaddress.IPv6Address] = set()
    for _family, _type, _proto, _canonname, sockaddr in addrinfo:
        resolved_host = sockaddr[0]
        try:
            addresses.add(ipaddress.ip_address(resolved_host))
        except ValueError:
            continue

    return addresses


def validate_url_safe_for_fetch(url: str) -> str:
    candidate = url.strip()
    parsed = urlsplit(candidate)
    scheme = parsed.scheme.lower()

    if scheme not in ALLOWED_FETCH_SCHEMES:
        raise UnsafeFetchUrlError("Fetch URLs must use http or https")

    if not parsed.netloc:
        raise UnsafeFetchUrlError("Fetch URLs must include a host")

    hostname = (parsed.hostname or "").rstrip(".")
    if not hostname:
        raise UnsafeFetchUrlError("Fetch URLs must include a host")

    literal_host = hostname.partition("%")[0]
    try:
        literal_address = ipaddress.ip_address(literal_host)
    except ValueError:
        literal_address = None

    if literal_address is not None:
        _ensure_public_address(literal_address, hostname)
        return candidate

    try:
        port = parsed.port
    except ValueError as exc:
        raise UnsafeFetchUrlError("Fetch URL port is invalid") from exc

    resolved_port = port or (443 if scheme == "https" else 80)
    for resolved_address in _resolve_hostname_addresses(hostname, resolved_port):
        _ensure_public_address(resolved_address, hostname)

    return candidate


def validate_redirect_target_for_fetch(source_url: str, location: str | None) -> str:
    if not location:
        raise UnsafeFetchUrlError(
            "Fetch redirect response is missing a Location header"
        )

    return validate_url_safe_for_fetch(urljoin(source_url, location))
