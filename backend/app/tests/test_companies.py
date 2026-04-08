from datetime import datetime
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app import schemas
from app.api.routes import companies as company_routes


@pytest.mark.asyncio
async def test_extract_company_rejects_unsafe_url() -> None:
    with pytest.raises(HTTPException) as exc_info:
        await company_routes.extract_company(
            extraction_url="http://127.0.0.1/internal",
            db=None,
            user=SimpleNamespace(id=uuid4()),
        )

    assert exc_info.value.status_code == 422
    assert "non-public IP" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_extract_company_preserves_http_422_from_run_extractor(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    extractor = schemas.ExtractorRead(
        id=uuid4(),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        name="company",
        description="Company data extraction",
        instruction="Extract company JSON data from a given context",
        json_schema=schemas.CompanyCreate.model_json_schema(),
        extractor_examples=[],
    )

    async def fake_get_extractor_by_name(name, db):
        return extractor

    async def fake_run_extractor(*args, **kwargs):
        raise HTTPException(
            status_code=422,
            detail="Fetch URL redirect target 'http://127.0.0.1/internal' is unsafe",
        )

    monkeypatch.setattr(
        company_routes,
        "get_extractor_by_name",
        fake_get_extractor_by_name,
    )
    monkeypatch.setattr(company_routes, "run_extractor", fake_run_extractor)

    with pytest.raises(HTTPException) as exc_info:
        await company_routes.extract_company(
            extraction_url="https://example.com/company",
            db=None,
            user=SimpleNamespace(id=uuid4()),
        )

    assert exc_info.value.status_code == 422
    assert "redirect target" in str(exc_info.value.detail)
