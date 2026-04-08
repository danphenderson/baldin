import uuid
from pathlib import Path

from fastapi import Request
from pydantic import EmailStr, TypeAdapter, ValidationError
from starlette.middleware import Middleware
from starlette.middleware.sessions import SessionMiddleware
from starlette.responses import RedirectResponse, Response
from starlette_admin.auth import AdminConfig, AdminUser, AuthProvider
from starlette_admin.contrib.sqla import Admin
from starlette_admin.contrib.sqla.ext.pydantic import ModelView
from starlette_admin.exceptions import FormValidationError, LoginFailed
from starlette_admin.views import DropDown, Link

from app import models, schemas
from app.core import conf
from app.core.db import async_engine
from app.core.security import authenticate_superuser_credentials

ADMIN_TEMPLATES_DIR = Path(__file__).with_name("admin_templates")
ADMIN_SESSION_KEY = "admin_user_id"
ADMIN_SESSION_COOKIE = "baldin_admin_session"
ADMIN_SESSION_MAX_AGE = 12 * 60 * 60
ADMIN_EMAIL_ADAPTER = TypeAdapter(EmailStr)


class UserAdminView(ModelView):
    fields = [
        "id",
        "email",
        "first_name",
        "last_name",
        "is_active",
        "is_superuser",
        "is_verified",
        "created_at",
        "updated_at",
    ]
    searchable_fields = ["email", "first_name", "last_name"]
    sortable_fields = [
        "email",
        "first_name",
        "last_name",
        "created_at",
        "updated_at",
        "is_active",
        "is_superuser",
        "is_verified",
    ]
    export_fields = [
        "id",
        "email",
        "first_name",
        "last_name",
        "is_active",
        "is_superuser",
        "is_verified",
        "created_at",
        "updated_at",
    ]

    def can_create(self, request: Request) -> bool:
        return False

    def can_edit(self, request: Request) -> bool:
        return False

    def can_delete(self, request: Request) -> bool:
        return False


class AdminAuthProvider(AuthProvider):
    async def render_login(self, request: Request, admin: Admin) -> Response:
        entered_username = ""
        if request.method == "GET":
            return admin.templates.TemplateResponse(
                request=request,
                name="login.html",
                context={
                    "_is_login_path": True,
                    "entered_username": entered_username,
                },
            )

        form = await request.form()
        entered_username = str(form.get("username") or "").strip()
        try:
            return await self.login(
                entered_username,
                str(form.get("password") or ""),
                False,
                request,
                RedirectResponse(
                    request.query_params.get("next")
                    or request.url_for(admin.route_name + ":index"),
                    status_code=303,
                ),
            )
        except FormValidationError as errors:
            return admin.templates.TemplateResponse(
                request=request,
                name="login.html",
                context={
                    "form_errors": errors,
                    "_is_login_path": True,
                    "entered_username": entered_username,
                },
                status_code=422,
            )
        except LoginFailed as error:
            return admin.templates.TemplateResponse(
                request=request,
                name="login.html",
                context={
                    "error": error.msg,
                    "_is_login_path": True,
                    "entered_username": entered_username,
                },
                status_code=400,
            )

    async def is_authenticated(self, request: Request) -> bool:
        user_id = request.session.get(ADMIN_SESSION_KEY)
        if user_id is None:
            return False

        try:
            parsed_user_id = uuid.UUID(str(user_id))
        except (TypeError, ValueError):
            request.session.clear()
            return False

        user = await request.state.session.get(models.User, parsed_user_id)
        if user is None or not user.is_active or not user.is_superuser:
            request.session.clear()
            return False

        request.state.user = user
        return True

    def get_admin_user(self, request: Request) -> AdminUser:
        user = getattr(request.state, "user", None)
        if user is None:
            return AdminUser(username="Administrator", photo_url=None)

        display_name = " ".join(
            part for part in [user.first_name, user.last_name] if part
        ).strip()
        return AdminUser(
            username=display_name or user.email,
            photo_url=user.avatar_uri or None,
        )

    def get_admin_config(self, request: Request) -> AdminConfig:
        return AdminConfig(app_title="Baldin Admin")

    async def logout(self, request: Request, response: Response) -> Response:
        request.session.clear()
        return response

    async def login(
        self,
        username: str,
        password: str,
        remember_me: bool,
        request: Request,
        response: Response,
    ) -> Response:
        del remember_me
        errors = {}
        normalized_email = username.strip().lower()
        if not normalized_email:
            errors["username"] = "Email is required"
        else:
            try:
                normalized_email = ADMIN_EMAIL_ADAPTER.validate_python(normalized_email)
            except ValidationError:
                errors["username"] = "Valid email is required"
        if not password:
            errors["password"] = "Password is required"
        if errors:
            raise FormValidationError(errors)

        user = await authenticate_superuser_credentials(normalized_email, password)
        if user is None:
            raise LoginFailed("Invalid admin email or password.")

        request.session.clear()
        request.session[ADMIN_SESSION_KEY] = str(user.id)
        request.state.user = user
        return response


admin = Admin(
    async_engine,
    title="Baldin Admin Interface",
    auth_provider=AdminAuthProvider(),
    templates_dir=str(ADMIN_TEMPLATES_DIR),
    middlewares=[
        Middleware(
            SessionMiddleware,
            secret_key=conf.settings.SECRET_KEY,
            session_cookie=ADMIN_SESSION_COOKIE,
            max_age=ADMIN_SESSION_MAX_AGE,
            path="/admin",
            same_site="strict",
            https_only=conf.settings.ENVIRONMENT in {"STAGE", "PROD"},
        )
    ],
)
admin.add_view(UserAdminView(models.User, pydantic_model=schemas.UserCreate))
admin.add_view(
    ModelView(
        models.OrchestrationPipeline, pydantic_model=schemas.OrchestrationPipelineCreate
    )
)
admin.add_view(ModelView(models.Extractor, pydantic_model=schemas.ExtractorCreate))
admin.add_view(ModelView(models.Lead, pydantic_model=schemas.LeadCreate))
admin.add_view(ModelView(models.Company, pydantic_model=schemas.CompanyCreate))
admin.add_view(ModelView(models.Application, pydantic_model=schemas.ApplicationCreate))
admin.add_view(ModelView(models.Resume, pydantic_model=schemas.ResumeCreate))
admin.add_view(ModelView(models.Skill, pydantic_model=schemas.SkillCreate))
admin.add_view(ModelView(models.Experience, pydantic_model=schemas.ExperienceCreate))
admin.add_view(
    ModelView(
        models.OrchestrationEvent, pydantic_model=schemas.OrchestrationEventCreate
    )
)
admin.add_view(
    ModelView(models.ExtractorExample, pydantic_model=schemas.ExtractorExampleCreate)
)
admin.add_view(ModelView(models.Certificate, pydantic_model=schemas.CertificateCreate))
admin.add_view(ModelView(models.Contact, pydantic_model=schemas.ContactCreate))

admin.add_view(
    DropDown(
        "Useful Links",
        icon="fa fa-link",
        views=[
            Link("Swagger Docs", url="http://127.0.0.1:8004/docs", target="_blank"),
            Link("Baldin Frontend", url="http://localhost:5173/", target="_blank"),
        ],
    )
)
