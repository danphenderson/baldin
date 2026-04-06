from datetime import datetime, timezone


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def now_utc_naive() -> datetime:
    """Return a naive UTC datetime for legacy DB columns stored without tzinfo."""
    return now_utc().replace(tzinfo=None)


def ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def parse_utc_datetime(value: str | datetime | None) -> datetime | None:
    """Parse strings/datetimes as UTC, assuming naive inputs are already UTC."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return ensure_utc(value)
    try:
        return ensure_utc(datetime.fromisoformat(value.replace("Z", "+00:00")))
    except ValueError:
        return None


def format_utc_datetime(value: datetime) -> str:
    return ensure_utc(value).isoformat().replace("+00:00", "Z")


def normalize_utc_datetime(value: str | datetime | None) -> str | None:
    """Return a canonical UTC ISO string with Z suffix, or None if unparseable."""
    parsed = parse_utc_datetime(value)
    if parsed is None:
        return None
    return format_utc_datetime(parsed)
