from datetime import datetime
from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest
from fastapi import HTTPException
from httpx import AsyncClient

from app import models, schemas
from app.api.routes import companies as company_routes
from app.conftest import create_user, login_and_get_headers
from app.core.db import session_context


async def _create_company_record(
    name: str,
    *,
    creator_user_id: UUID | None = None,
) -> models.Company:
    async with session_context() as session:
        company = models.Company(name=name, creator_user_id=creator_user_id)
        session.add(company)
        await session.commit()
        await session.refresh(company)
        return company


def test_company_read_requires_persisted_fields() -> None:
    company = models.Company(name="Draft Corp")
    user = SimpleNamespace(id=uuid4(), is_superuser=False)

    with pytest.raises(ValueError, match="persisted"):
        company_routes._company_read(company, user)


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


@pytest.mark.asyncio
async def test_extract_company_sets_creator_attribution(
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

    class FakeDB:
        def __init__(self) -> None:
            self.saved: models.Company | None = None

        def add(self, company: models.Company) -> None:
            self.saved = company

        async def commit(self) -> None:
            return None

        async def refresh(self, company: models.Company) -> None:
            company.id = uuid4()
            company.created_at = datetime.utcnow()
            company.updated_at = datetime.utcnow()
            return None

    async def fake_get_extractor_by_name(name, db):
        return extractor

    async def fake_run_extractor(*args, **kwargs):
        return SimpleNamespace(data=[{"name": "Extracted Co", "industry": "AI"}])

    monkeypatch.setattr(
        company_routes,
        "get_extractor_by_name",
        fake_get_extractor_by_name,
    )
    monkeypatch.setattr(company_routes, "run_extractor", fake_run_extractor)

    db = FakeDB()
    user = SimpleNamespace(id=uuid4(), is_superuser=False)

    created = await company_routes.extract_company(
        extraction_url="https://example.com/company",
        db=db,
        user=user,
    )

    assert db.saved is not None
    assert db.saved.creator_user_id == user.id
    assert created.creator_user_id == user.id
    assert created.can_manage is True


@pytest.mark.asyncio
async def test_companies_reads_are_shared_but_permissions_are_owner_scoped(
    client: AsyncClient,
    registered_user: tuple[str, UUID, str],
) -> None:
    email, user_id, password = registered_user
    headers = await login_and_get_headers(client, email, password)
    _, other_user_id = await create_user("OtherCompanyOwner1!")

    legacy_company = await _create_company_record("Legacy Corp")
    other_company = await _create_company_record(
        "Shared Corp",
        creator_user_id=other_user_id,
    )

    create_response = await client.post(
        "/api/v1/companies/",
        json={"name": "Owned Corp", "industry": "Software"},
        headers=headers,
    )
    assert create_response.status_code == 200, create_response.text
    created = create_response.json()
    assert created["creator_user_id"] == str(user_id)
    assert created["can_manage"] is True

    list_response = await client.get("/api/v1/companies/", headers=headers)
    assert list_response.status_code == 200, list_response.text
    items = {item["name"]: item for item in list_response.json()["items"]}

    assert items["Owned Corp"]["can_manage"] is True
    assert items["Owned Corp"]["creator_user_id"] == str(user_id)
    assert items["Shared Corp"]["can_manage"] is False
    assert items["Shared Corp"]["creator_user_id"] == str(other_user_id)
    assert items["Legacy Corp"]["can_manage"] is False
    assert items["Legacy Corp"]["creator_user_id"] is None

    detail_response = await client.get(
        f"/api/v1/companies/{other_company.id}",
        headers=headers,
    )
    assert detail_response.status_code == 200, detail_response.text
    assert detail_response.json()["can_manage"] is False

    legacy_detail = await client.get(
        f"/api/v1/companies/{legacy_company.id}",
        headers=headers,
    )
    assert legacy_detail.status_code == 200, legacy_detail.text
    assert legacy_detail.json()["creator_user_id"] is None
    assert legacy_detail.json()["can_manage"] is False


@pytest.mark.asyncio
async def test_companies_only_creator_or_superuser_can_mutate_or_delete(
    client: AsyncClient,
) -> None:
    owner_email, owner_id = await create_user("CompanyOwner1!")
    viewer_email, _ = await create_user("CompanyViewer1!")
    admin_email, _ = await create_user("CompanyAdmin1!", is_superuser=True)

    owner_headers = await login_and_get_headers(client, owner_email, "CompanyOwner1!")
    viewer_headers = await login_and_get_headers(
        client,
        viewer_email,
        "CompanyViewer1!",
    )
    admin_headers = await login_and_get_headers(client, admin_email, "CompanyAdmin1!")

    company = await _create_company_record("Protected Corp", creator_user_id=owner_id)
    legacy_company = await _create_company_record("Legacy Managed Corp")

    viewer_patch = await client.patch(
        f"/api/v1/companies/{company.id}",
        json={"description": "Unauthorized edit"},
        headers=viewer_headers,
    )
    assert viewer_patch.status_code == 403, viewer_patch.text

    owner_patch = await client.patch(
        f"/api/v1/companies/{company.id}",
        json={"description": "Owner edit"},
        headers=owner_headers,
    )
    assert owner_patch.status_code == 200, owner_patch.text
    assert owner_patch.json()["description"] == "Owner edit"
    assert owner_patch.json()["can_manage"] is True

    viewer_legacy_patch = await client.patch(
        f"/api/v1/companies/{legacy_company.id}",
        json={"description": "Legacy edit"},
        headers=viewer_headers,
    )
    assert viewer_legacy_patch.status_code == 403, viewer_legacy_patch.text

    admin_patch = await client.patch(
        f"/api/v1/companies/{legacy_company.id}",
        json={"description": "Admin edit"},
        headers=admin_headers,
    )
    assert admin_patch.status_code == 200, admin_patch.text
    assert admin_patch.json()["description"] == "Admin edit"
    assert admin_patch.json()["can_manage"] is True

    viewer_delete = await client.delete(
        f"/api/v1/companies/{company.id}",
        headers=viewer_headers,
    )
    assert viewer_delete.status_code == 403, viewer_delete.text

    owner_delete = await client.delete(
        f"/api/v1/companies/{company.id}",
        headers=owner_headers,
    )
    assert owner_delete.status_code == 204, owner_delete.text

    legacy_delete = await client.delete(
        f"/api/v1/companies/{legacy_company.id}",
        headers=viewer_headers,
    )
    assert legacy_delete.status_code == 403, legacy_delete.text

    admin_delete = await client.delete(
        f"/api/v1/companies/{legacy_company.id}",
        headers=admin_headers,
    )
    assert admin_delete.status_code == 204, admin_delete.text
