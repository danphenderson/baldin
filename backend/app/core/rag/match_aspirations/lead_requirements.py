from __future__ import annotations

from typing import Any

from pydantic import Field, field_validator

from app import schemas
from app.extractor.extraction_runnable import extraction_runnable

LEAD_REQUIREMENTS_EXTRACTION_INSTRUCTIONS = (
    "Extract the lead's hiring requirements from the provided job text. "
    "Capture only requirements that are explicitly supported by the text. "
    "Use empty arrays when the text does not specify required skills or key "
    "responsibilities, and use null when seniority level or education level "
    "are not stated."
)

LEAD_REQUIREMENTS_SCHEMA = {
    "title": "lead_requirements",
    "type": "object",
    "properties": {
        "required_skills": {
            "type": "array",
            "items": {"type": "string"},
            "default": [],
        },
        "seniority_level": {"type": ["string", "null"], "default": None},
        "education_level": {"type": ["string", "null"], "default": None},
        "key_responsibilities": {
            "type": "array",
            "items": {"type": "string"},
            "default": [],
        },
    },
    "required": [
        "required_skills",
        "seniority_level",
        "education_level",
        "key_responsibilities",
    ],
    "additionalProperties": False,
}


def _normalize_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


def _normalize_text_list(values: Any) -> list[str]:
    if values is None:
        return []
    if isinstance(values, str):
        raw_values = [values]
    elif isinstance(values, (list, tuple, set)):
        raw_values = list(values)
    else:
        raw_values = [values]

    normalized: list[str] = []
    seen: set[str] = set()
    for value in raw_values:
        cleaned = " ".join(str(value).split()).strip()
        if not cleaned:
            continue
        lowered = cleaned.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        normalized.append(cleaned)
    return normalized


class LeadRequirements(schemas.BaseSchema):
    required_skills: list[str] = Field(default_factory=list)
    seniority_level: str | None = None
    education_level: str | None = None
    key_responsibilities: list[str] = Field(default_factory=list)

    @field_validator("required_skills", "key_responsibilities", mode="before")
    @classmethod
    def normalize_list_fields(cls, value: Any) -> list[str]:
        return _normalize_text_list(value)

    @field_validator("seniority_level", "education_level", mode="before")
    @classmethod
    def normalize_optional_fields(cls, value: str | None) -> str | None:
        return _normalize_optional_text(value)

    def compact_dict(self) -> dict[str, object]:
        data = self.model_dump(mode="python")
        return {
            key: value for key, value in data.items() if value not in (None, [], "")
        }


def build_lead_requirements_text(lead: schemas.LeadRankInput) -> str:
    return "\n\n".join(
        part.strip()
        for part in (lead.title or "", lead.description or "")
        if part and part.strip()
    )


async def _run_lead_requirements_extraction(
    request: schemas.ExtractorRequest,
) -> dict:
    result = await extraction_runnable.ainvoke(request)
    if hasattr(result, "model_dump"):
        return result.model_dump(mode="python")
    return result


async def extract_lead_requirements(
    lead: schemas.LeadRankInput,
    *,
    llm_name: str | None = None,
) -> LeadRequirements | None:
    text = build_lead_requirements_text(lead)
    if not text:
        return None

    response = await _run_lead_requirements_extraction(
        schemas.ExtractorRequest(
            text=text,
            schema=LEAD_REQUIREMENTS_SCHEMA,
            instructions=LEAD_REQUIREMENTS_EXTRACTION_INSTRUCTIONS,
            llm_name=llm_name,
        )
    )
    payload = response or {}
    if isinstance(payload, dict) and "data" in payload:
        items = payload.get("data") or []
        payload = items[0] if items else {}
    return LeadRequirements.model_validate(payload)
