# Path: app/api/routes/admin.py
from fastapi import HTTPException, Request
from starlette.responses import Response
from starlette.status import HTTP_401_UNAUTHORIZED
from starlette_admin.auth import AdminConfig, AdminUser, AuthProvider
from starlette_admin.contrib.sqla import Admin
from starlette_admin.contrib.sqla.ext.pydantic import ModelView
from starlette_admin.views import DropDown, Link

from app import models, schemas
from app.core.db import async_engine
from app.core.security import get_current_user


# Auth setup
class AdminAuthProvider(AuthProvider):
    async def is_authenticated(self, request: Request) -> bool:
        """
        Check if a user is authenticated for admin access using the JWT strategy.
        """
        user = await get_current_user()
        if user:
            request.state.user = user
            return True
        return False

    def get_admin_user(self, request: Request) -> AdminUser:
        """
        Retrieve the current admin user details.
        """
        user = request.state.user
        return AdminUser(
            username=user.email, photo_url=None
        )  # Adapt as needed for your user model

    def get_admin_config(self, request: Request) -> AdminConfig:
        """
        Configure admin panel based on the authenticated user.
        """
        user = request.state.user
        return AdminConfig(
            app_title=f"Admin Panel - {user.email}"
        )  # Customize the title

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

    async def logout(self, request: Request, response: Response) -> Response:
        """
        Clear session or token on logout. Might be handled by frontend or via a specific API endpoint.
        """
        # Since we use JWT, typically the frontend would just discard the token.
        return response


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
