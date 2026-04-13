from __future__ import annotations

from collections import Counter

from fastapi import HTTPException
from langchain_core.prompts import ChatPromptTemplate
from sqlalchemy import desc, select

from app import models, schemas
from app.core.langchain import ainvoke_structured_prompt
from app.core.user_profile import load_user_profile, serialize_user_profile

_MAX_SUGGESTIONS = 6
_MAX_PER_KIND = 3
_NO_USABLE_PROFILE_SIGNAL_DETAIL = (
    "Your profile does not contain enough information to suggest aspirations."
)


def _build_prompt() -> ChatPromptTemplate:
    return ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are a career advisor generating aspiration drafts from a user's "
                "profile. Return up to 6 total suggestions, with at most 3 role "
                "suggestions and 3 company suggestions. Avoid duplicates from the "
                "exclusion list. Company suggestions must be grounded in the user's "
                "profile; when a specific employer is not well-supported, suggest a "
                "company type or employer environment instead of inventing a brand. "
                "Leave optional text fields null when there is no grounded content.",
            ),
            (
                "user",
                "User profile:\n{profile_text}\n\n"
                "Existing aspirations to exclude:\n{excluded_text}\n\n"
                "Return non-persisted aspiration drafts only. Keep labels concise, "
                "reasons evidence-based, and notes short.",
            ),
        ]
    )


def _normalize_key(
    kind: schemas.AspirationKind,
    label: str,
) -> tuple[schemas.AspirationKind, str]:
    normalized = schemas.AspirationCreate(kind=kind, label=label)
    return normalized.kind, normalized.label


def _render_profile_text(profile: dict[str, object]) -> str:
    lines: list[str] = []
    if profile.get("headline"):
        lines.append(f"Headline: {profile['headline']}")
    if profile.get("bio"):
        lines.append(f"Bio: {profile['bio']}")

    skills = profile.get("skills") or []
    if skills:
        skill_lines = []
        for skill in skills:
            if not isinstance(skill, dict):
                continue
            label = skill.get("name") or skill.get("category")
            if not label:
                continue
            details = [str(label).strip()]
            if skill.get("yoe") is not None:
                details.append(f"{skill['yoe']} years")
            if skill.get("subskills"):
                details.append(
                    f"subskills: {', '.join(str(item).strip() for item in skill['subskills'] if str(item).strip())}"
                )
            skill_lines.append(" | ".join(details))
        if skill_lines:
            lines.append("Skills:")
            lines.extend(f"- {line}" for line in skill_lines)

    experiences = profile.get("experiences") or []
    if experiences:
        experience_lines = []
        for experience in experiences:
            if not isinstance(experience, dict):
                continue
            parts = [
                str(value).strip()
                for value in (
                    experience.get("title"),
                    experience.get("company"),
                    experience.get("description"),
                )
                if value and str(value).strip()
            ]
            projects = experience.get("projects") or []
            project_text = ", ".join(
                str(item).strip() for item in projects if str(item).strip()
            )
            if project_text:
                parts.append(f"projects: {project_text}")
            if parts:
                experience_lines.append(" | ".join(parts))
        if experience_lines:
            lines.append("Experiences:")
            lines.extend(f"- {line}" for line in experience_lines)

    education = profile.get("education") or []
    if education:
        education_lines = []
        for item in education:
            if not isinstance(item, dict):
                continue
            parts = [
                str(value).strip()
                for value in (item.get("degree"), item.get("university"))
                if value and str(value).strip()
            ]
            achievements = item.get("achievements") or []
            achievement_text = ", ".join(
                str(value).strip() for value in achievements if str(value).strip()
            )
            if achievement_text:
                parts.append(f"achievements: {achievement_text}")
            if parts:
                education_lines.append(" | ".join(parts))
        if education_lines:
            lines.append("Education:")
            lines.extend(f"- {line}" for line in education_lines)

    certificates = profile.get("certificates") or []
    if certificates:
        certificate_lines = []
        for certificate in certificates:
            if not isinstance(certificate, dict):
                continue
            parts = [
                str(value).strip()
                for value in (certificate.get("title"), certificate.get("issuer"))
                if value and str(value).strip()
            ]
            if parts:
                certificate_lines.append(" | ".join(parts))
        if certificate_lines:
            lines.append("Certificates:")
            lines.extend(f"- {line}" for line in certificate_lines)

    return "\n".join(lines)


def _format_existing_aspirations(aspirations: list[models.Aspiration]) -> str:
    if not aspirations:
        return "None"
    return "\n".join(
        f"- [{aspiration.kind}] {aspiration.label}" for aspiration in aspirations
    )


def _dedupe_suggestions(
    suggestions: list[schemas.AspirationSuggestionDraft],
    *,
    exclusions: set[tuple[schemas.AspirationKind, str]],
) -> list[schemas.AspirationSuggestionDraft]:
    deduped: list[schemas.AspirationSuggestionDraft] = []
    per_kind: Counter[schemas.AspirationKind] = Counter()
    seen = set(exclusions)

    for suggestion in suggestions:
        normalized = schemas.AspirationSuggestionDraft.model_validate(
            {
                **suggestion.model_dump(mode="python"),
                "priority": 0,
            }
        )
        key = (normalized.kind, normalized.label)
        if key in seen:
            continue
        if per_kind[normalized.kind] >= _MAX_PER_KIND:
            continue
        deduped.append(normalized)
        seen.add(key)
        per_kind[normalized.kind] += 1
        if len(deduped) >= _MAX_SUGGESTIONS:
            break

    return deduped


class AspirationSuggestionService:
    def __init__(self, db) -> None:
        self.db = db

    async def _load_existing_aspirations(self, user_id) -> list[models.Aspiration]:
        result = await self.db.execute(
            select(models.Aspiration)
            .where(models.Aspiration.user_id == user_id)
            .order_by(
                desc(models.Aspiration.priority),
                desc(models.Aspiration.updated_at),
                desc(models.Aspiration.created_at),
            )
        )
        return result.scalars().all()

    async def suggest(
        self,
        user: schemas.UserRead,
    ) -> schemas.AspirationSuggestResponse:
        user_profile = await load_user_profile(self.db, user_id=user.id)
        serialized_profile = serialize_user_profile(user_profile)
        profile_text = _render_profile_text(serialized_profile)
        if not profile_text.strip():
            raise HTTPException(
                status_code=400,
                detail=_NO_USABLE_PROFILE_SIGNAL_DETAIL,
            )

        existing_aspirations = await self._load_existing_aspirations(user.id)
        exclusions = {
            _normalize_key(schemas.AspirationKind(aspiration.kind), aspiration.label)
            for aspiration in existing_aspirations
        }

        draft = await ainvoke_structured_prompt(
            _build_prompt(),
            {
                "profile_text": profile_text,
                "excluded_text": _format_existing_aspirations(existing_aspirations),
            },
            schemas.AspirationSuggestResponse,
        )
        return schemas.AspirationSuggestResponse(
            suggestions=_dedupe_suggestions(draft.suggestions, exclusions=exclusions)
        )
