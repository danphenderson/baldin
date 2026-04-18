"""Round-trip schema tests for application stage / outcome fields."""

from datetime import datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app import schemas
from app.models import ApplicationOutcome, ApplicationStage

NOW = datetime(2026, 1, 2, 3, 4, 5)


def _user_payload(user_id: str) -> dict[str, object]:
    return {
        "id": user_id,
        "email": "schema-test@example.com",
        "is_active": True,
        "is_superuser": False,
        "is_verified": True,
    }


def _lead_payload(lead_id: str) -> dict[str, object]:
    return {
        "id": lead_id,
        "created_at": NOW,
        "updated_at": NOW,
        "url": "https://example.com/jobs/schema-test",
        "canonical_url": "https://example.com/jobs/schema-test",
    }


def _application_read_payload(**overrides: object) -> dict[str, object]:
    lead_id = str(uuid4())
    user_id = str(uuid4())
    payload: dict[str, object] = {
        "id": str(uuid4()),
        "created_at": NOW,
        "updated_at": NOW,
        "lead_id": lead_id,
        "user_id": user_id,
        "lead": _lead_payload(lead_id),
        "user": _user_payload(user_id),
        "status_history": [],
        "stage": ApplicationStage.REGISTERED.value,
    }
    payload.update(overrides)
    return payload


def _assert_stage_outcome(
    model: schemas.ApplicationCreate
    | schemas.ApplicationRead
    | schemas.ApplicationUpdate,
    dumped: dict[str, object],
    *,
    expected_stage: ApplicationStage | None,
    expected_outcome: ApplicationOutcome | None,
) -> None:
    assert model.stage == expected_stage
    assert model.outcome == expected_outcome
    assert dumped["stage"] == (
        expected_stage.value if expected_stage is not None else None
    )
    assert dumped["outcome"] == (
        expected_outcome.value if expected_outcome is not None else None
    )


@pytest.mark.parametrize(
    ("payload", "expected_stage", "expected_outcome"),
    [
        (
            {},
            ApplicationStage.REGISTERED,
            None,
        ),
        (
            {"stage": ApplicationStage.SCREENING.value},
            ApplicationStage.SCREENING,
            None,
        ),
        (
            {"stage": ApplicationStage.INTERVIEW.value},
            ApplicationStage.INTERVIEW,
            None,
        ),
        (
            {"outcome": ApplicationOutcome.WITHDRAWN.value},
            ApplicationStage.REGISTERED,
            ApplicationOutcome.WITHDRAWN,
        ),
        (
            {"outcome": ApplicationOutcome.REJECTED.value},
            ApplicationStage.REGISTERED,
            ApplicationOutcome.REJECTED,
        ),
    ],
)
def test_application_create_round_trip(
    payload: dict[str, str],
    expected_stage: ApplicationStage | None,
    expected_outcome: ApplicationOutcome | None,
) -> None:
    application = schemas.ApplicationCreate.model_validate(
        {"lead_id": str(uuid4()), **payload}
    )

    dumped = application.model_dump(mode="json")
    round_trip = schemas.ApplicationCreate.model_validate(dumped)

    _assert_stage_outcome(
        application,
        dumped,
        expected_stage=expected_stage,
        expected_outcome=expected_outcome,
    )
    _assert_stage_outcome(
        round_trip,
        round_trip.model_dump(mode="json"),
        expected_stage=expected_stage,
        expected_outcome=expected_outcome,
    )


@pytest.mark.parametrize(
    ("overrides", "expected_stage", "expected_outcome"),
    [
        (
            {"stage": ApplicationStage.APPLIED.value},
            ApplicationStage.APPLIED,
            None,
        ),
        (
            {"stage": ApplicationStage.OFFER.value},
            ApplicationStage.OFFER,
            None,
        ),
        (
            {
                "outcome": ApplicationOutcome.WITHDRAWN.value,
                "stage": ApplicationStage.APPLIED.value,
            },
            ApplicationStage.APPLIED,
            ApplicationOutcome.WITHDRAWN,
        ),
    ],
)
def test_application_read_round_trip(
    overrides: dict[str, str],
    expected_stage: ApplicationStage | None,
    expected_outcome: ApplicationOutcome | None,
) -> None:
    application = schemas.ApplicationRead.model_validate(
        _application_read_payload(**overrides)
    )

    dumped = application.model_dump(mode="json")
    round_trip = schemas.ApplicationRead.model_validate(dumped)

    _assert_stage_outcome(
        application,
        dumped,
        expected_stage=expected_stage,
        expected_outcome=expected_outcome,
    )
    _assert_stage_outcome(
        round_trip,
        round_trip.model_dump(mode="json"),
        expected_stage=expected_stage,
        expected_outcome=expected_outcome,
    )


@pytest.mark.parametrize(
    ("payload", "expected_stage", "expected_outcome"),
    [
        (
            {"stage": ApplicationStage.OFFER.value},
            ApplicationStage.OFFER,
            None,
        ),
        (
            {"stage": ApplicationStage.SCREENING.value},
            ApplicationStage.SCREENING,
            None,
        ),
        (
            {"outcome": ApplicationOutcome.REJECTED.value},
            None,
            ApplicationOutcome.REJECTED,
        ),
        (
            {"outcome": ApplicationOutcome.WITHDRAWN.value},
            None,
            ApplicationOutcome.WITHDRAWN,
        ),
    ],
)
def test_application_update_round_trip(
    payload: dict[str, str],
    expected_stage: ApplicationStage | None,
    expected_outcome: ApplicationOutcome | None,
) -> None:
    update = schemas.ApplicationUpdate.model_validate(payload)

    dumped = update.model_dump(mode="json")
    round_trip = schemas.ApplicationUpdate.model_validate(dumped)

    _assert_stage_outcome(
        update,
        dumped,
        expected_stage=expected_stage,
        expected_outcome=expected_outcome,
    )
    _assert_stage_outcome(
        round_trip,
        round_trip.model_dump(mode="json"),
        expected_stage=expected_stage,
        expected_outcome=expected_outcome,
    )


def test_application_update_round_trip_preserves_reopen_flag() -> None:
    update = schemas.ApplicationUpdate.model_validate(
        {"stage": ApplicationStage.SCREENING.value, "reopen": True}
    )

    dumped = update.model_dump(mode="json")
    round_trip = schemas.ApplicationUpdate.model_validate(dumped)

    _assert_stage_outcome(
        update,
        dumped,
        expected_stage=ApplicationStage.SCREENING,
        expected_outcome=None,
    )
    assert update.reopen is True
    assert dumped["reopen"] is True
    assert round_trip.reopen is True


def test_application_create_round_trip_preserves_terminal_outcome_reason() -> None:
    application = schemas.ApplicationCreate.model_validate(
        {
            "lead_id": str(uuid4()),
            "outcome": ApplicationOutcome.REJECTED.value,
            "outcome_reason": "  Role closed internally  ",
        }
    )

    dumped = application.model_dump(mode="json")
    round_trip = schemas.ApplicationCreate.model_validate(dumped)

    assert application.outcome_reason == "Role closed internally"
    assert dumped["outcome_reason"] == "Role closed internally"
    assert round_trip.outcome_reason == "Role closed internally"


def test_application_create_rejects_outcome_reason_for_active_status() -> None:
    with pytest.raises(ValidationError):
        schemas.ApplicationCreate.model_validate(
            {
                "lead_id": str(uuid4()),
                "stage": ApplicationStage.SCREENING.value,
                "outcome_reason": "Still deciding",
            }
        )


def test_application_read_clears_outcome_reason_when_no_outcome() -> None:
    application = schemas.ApplicationRead.model_validate(
        _application_read_payload(
            stage=ApplicationStage.APPLIED.value,
            outcome_reason="Should not leak",
        )
    )

    assert application.outcome_reason is None
