from datetime import datetime, timezone

from app.core.datetime_utils import normalize_utc_datetime, parse_utc_datetime


def test_parse_utc_datetime_assumes_utc_for_naive_iso_strings() -> None:
    parsed = parse_utc_datetime("2026-01-02T03:04:05")

    assert parsed == datetime(2026, 1, 2, 3, 4, 5, tzinfo=timezone.utc)


def test_normalize_utc_datetime_emits_z_suffix() -> None:
    normalized = normalize_utc_datetime(datetime(2026, 1, 2, 3, 4, 5))

    assert normalized == "2026-01-02T03:04:05Z"


def test_parse_utc_datetime_returns_none_for_invalid_values() -> None:
    assert parse_utc_datetime("not-a-timestamp") is None
    assert parse_utc_datetime(123) is None  # type: ignore[arg-type]
