# Path: app/api/routes/admin.py
from venv import logger

from fastapi import Depends, HTTPException, Request
from starlette.responses import Response
from starlette.status import HTTP_401_UNAUTHORIZED
from starlette_admin.auth import AdminConfig, AdminUser, AuthProvider
from starlette_admin.contrib.sqla import Admin
from starlette_admin.contrib.sqla.ext.pydantic import ModelView
from starlette_admin.views import DropDown, Link

from app import models, schemas
from app.core.db import async_engine
from app.core.security import get_current_user
from app.logging import console_log as log
from app.logging import get_logger

# log = get_logger(__name__)

# Auth setup
class AdminAuthProvider(AuthProvider):
    async def is_authenticated(self, request: Request) -> bool:
        """
        Check if a user is authenticated for admin access using JWT.
        """
        return False

    def get_admin_user(self, request: Request) -> AdminUser:
        """
        Retrieve the current admin user details.
        """
        log.info("Getting admin user")
        log.warning(f"form: {request._form}")
        username = request._form.__dict__.get("username", "No user")
        log.warning(f"Request state: {username}")

        return AdminUser(username=username, photo_url=None)

    def get_admin_config(self, request: Request) -> AdminConfig:
        """
        Configure the admin panel based on the authenticated user.
        """
        return AdminConfig(app_title=f"Admin")

    async def logout(self, request: Request, response: Response) -> Response:
        """
        Clear session or token on logout. Might be handled by frontend or via a specific API endpoint.
        """
        # JWT doesn't maintain session state, so this is typically no-op for JWT-based auth
        response.delete_cookie("auth_cookie")
        return response

    async def login(
        self,
        username: str,
        password: str,
        remember_me: bool,
        request: Request,
        response: Response,
    ) -> Response:
        """
        Perform login operation. This method might not be necessary if JWT handles all auth,
        but can be adapted for form-based login if required.
        """
        # Not implemented, as JWT should handle the login via API endpoint.
        raise HTTPException(
            status_code=HTTP_401_UNAUTHORIZED, detail="Please use JWT to log in."
        )


# Admin setup
admin = Admin(
    async_engine, title="Baldin Admin Interface", auth_provider=AdminAuthProvider()
)
admin.add_view(ModelView(models.User, pydantic_model=schemas.UserCreate))
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

# DropDown
admin.add_view(
    DropDown(
        "Useful Links",
        icon="fa fa-link",
        views=[
            Link("Swagger Docs", url="http://127.0.0.1:8004/docs", target="_blank"),
            Link("Baldin Frontend", url="http://localhost:3000/", target="_blank"),
        ],
    )
)
