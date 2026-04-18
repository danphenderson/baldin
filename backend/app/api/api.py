# app/api/api.py

from fastapi import APIRouter
from fastapi.routing import APIRoute

from app.api.deps import fastapi_users, schemas
from app.api.routes import (
    action_items,
    activity_feed,
    agents,
    applications,
    aspirations,
    auth,
    certificate,
    collaboration,
    companies,
    connections,
    contacts,
    crawlers,
    data_orchestration,
    db_management,
    directory,
    documents,
    education,
    experiences,
    extractor,
    leads,
    messages,
    mfa,
    review,
    skills,
    users,
)
from app.core.rate_limit import limiter

api_router: APIRouter = APIRouter(prefix="/api/v1")


def _build_rate_limited_router(source_router: APIRouter, limit: str) -> APIRouter:
    """Clone a generated router and add a SlowAPI limit to every HTTP route."""
    limited_router = APIRouter()

    for route in source_router.routes:
        if not isinstance(route, APIRoute):
            continue

        limited_router.add_api_route(
            route.path,
            limiter.limit(limit)(route.endpoint),
            methods=list(route.methods or []),
            response_model=route.response_model,
            status_code=route.status_code,
            tags=route.tags,
            dependencies=route.dependencies,
            summary=route.summary,
            description=route.description,
            response_description=route.response_description,
            responses=route.responses,
            deprecated=route.deprecated,
            operation_id=route.operation_id,
            response_model_include=route.response_model_include,
            response_model_exclude=route.response_model_exclude,
            response_model_by_alias=route.response_model_by_alias,
            response_model_exclude_unset=route.response_model_exclude_unset,
            response_model_exclude_defaults=route.response_model_exclude_defaults,
            response_model_exclude_none=route.response_model_exclude_none,
            include_in_schema=route.include_in_schema,
            name=route.name,
            openapi_extra=route.openapi_extra,
        )

    return limited_router


public_register_router = _build_rate_limited_router(
    fastapi_users.get_register_router(schemas.UserRead, schemas.UserCreate),
    "5/minute",
)
public_reset_password_router = _build_rate_limited_router(
    fastapi_users.get_reset_password_router(),
    "5/minute",
)
public_verify_router = _build_rate_limited_router(
    fastapi_users.get_verify_router(schemas.UserRead),
    "5/minute",
)

api_router.include_router(
    auth.router,
    prefix="/auth/jwt",
    tags=["auth"],
)
api_router.include_router(
    public_register_router,
    prefix="/auth",
    tags=["auth"],
)
api_router.include_router(
    public_reset_password_router,
    prefix="/auth",
    tags=["auth"],
)
api_router.include_router(
    public_verify_router,
    prefix="/auth",
    tags=["auth"],
)
api_router.include_router(
    mfa.router,
    prefix="/auth/mfa",
    tags=["auth"],
)
api_router.include_router(
    db_management.router, prefix="/db-management", tags=["db-management"]
)
api_router.include_router(
    users.router,
    prefix="/users",
    tags=["users"],
)
api_router.include_router(
    leads.router,
    prefix="/leads",
    tags=["leads"],
)
api_router.include_router(
    companies.router,
    prefix="/companies",
    tags=["companies"],
)
api_router.include_router(
    data_orchestration.router,
    prefix="/orchestration-pipelines",
    tags=["orchestration-pipelines"],
)
api_router.include_router(
    contacts.router,
    prefix="/contacts",
    tags=["contacts"],
)
api_router.include_router(
    experiences.router,
    prefix="/experiences",
    tags=["experiences"],
)
api_router.include_router(
    skills.router,
    prefix="/skills",
    tags=["skills"],
)
api_router.include_router(
    agents.router,
    prefix="/agents",
    tags=["agents"],
)
api_router.include_router(
    applications.router,
    prefix="/applications",
    tags=["applications"],
)
api_router.include_router(
    aspirations.router,
    prefix="/aspirations",
    tags=["aspirations"],
)
api_router.include_router(
    documents.router,
    prefix="/documents",
    tags=["documents"],
)
api_router.include_router(
    education.router,
    prefix="/education",
    tags=["education"],
)
api_router.include_router(
    certificate.router,
    prefix="/certificates",
    tags=["certificates"],
)
api_router.include_router(
    extractor.router,
    prefix="/extractors",
    tags=["extractors"],
)
api_router.include_router(
    crawlers.router,
    prefix="/crawlers",
    tags=["crawlers"],
)
api_router.include_router(
    directory.router,
    prefix="/directory",
    tags=["directory"],
)
api_router.include_router(
    connections.router,
    prefix="/connections",
    tags=["connections"],
)
api_router.include_router(
    messages.router,
    prefix="/conversations",
    tags=["messaging"],
)
api_router.include_router(
    collaboration.router,
    prefix="/documents",
    tags=["collaboration"],
)
api_router.include_router(
    action_items.router,
    prefix="/action-items",
    tags=["action-items"],
)
api_router.include_router(
    activity_feed.router,
    prefix="/activity-feed",
    tags=["activity-feed"],
)
api_router.include_router(
    review.router,
    prefix="/review",
    tags=["review"],
)
