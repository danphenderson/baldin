# Path: app/tests/utils.py
import random
import string
from datetime import datetime, timedelta

from fastapi_users_db_sqlalchemy import SQLAlchemyUserDatabase
from pydantic import UUID4
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Application,
    Contact,
    CoverLetter,
    Experience,
    Lead,
    OrchestrationEvent,
    Resume,
    Skill,
    User,
)


def random_lower_string(length: int = 32) -> str:
    return "".join(random.choices(string.ascii_lowercase, k=length))


def random_email(length: int = 10) -> str:
    return f"{random_lower_string(length)}@{random_lower_string(length)}.com"


async def create_db_user(
    email: str,
    hashed_password: str,
    session: AsyncSession,
    is_superuser: bool = False,
    is_verified: bool = True,
) -> User:
    new_user = await SQLAlchemyUserDatabase(session, User).create(
        {
            "email": email,
            "hashed_password": hashed_password,
            "is_superuser": is_superuser,
            "is_verified": is_verified,
        }
    )
    return new_user


async def create_etl_event(session: AsyncSession):
    etl_event = OrchestrationEvent(
        job_name="Test Job",
        status=random.choice(["pending", "running", "success", "failed"]),
        error_message="Test error" if random.choice([True, False]) else None,
    )
    session.add(etl_event)
    await session.commit()
    return etl_event


async def create_lead(session: AsyncSession):
    lead = Lead(
        url="http://example.com/job",
        title="Test Job Title",
        company="Test Company",
        description="Test Job Description",
        location="Test Location",
        salary="50,000 - 70,000",
        job_function="Test Function",
        industries="Test Industry",
        employment_type="Full-Time",
        seniority_level="Mid-Level",
        education_level="Bachelor's",
        notes="Test Note",
    )
    session.add(lead)
    await session.commit()
    return lead


async def create_skill(session: AsyncSession, user_id: UUID4):
    skill = Skill(name="Test Skill", category="Test Category", user_id=user_id)
    session.add(skill)
    await session.commit()
    return skill


async def create_experience(session: AsyncSession, user_id: UUID4):
    experience = Experience(
        title="Test Job Title",
        company="Test Company",
        start_date=datetime.now() - timedelta(days=365),
        end_date=datetime.now(),
        description="Test Experience Description",
        user_id=user_id,
    )
    session.add(experience)
    await session.commit()
    return experience


async def create_application(session: AsyncSession, user_id: UUID4, lead_id: UUID4):
    application = Application(
        cover_letter="Test Cover Letter",
        status="submitted",
        lead_id=lead_id,
        user_id=user_id,
    )
    session.add(application)
    await session.commit()
    return application


async def create_contact(session: AsyncSession, user_id: UUID4):
    contact = Contact(
        first_name="Test",
        last_name="Contact",
        phone_number="123-456-7890",
        email="test.contact@example.com",
        time_zone="UTC",
        notes="Test Note",
        user_id=user_id,
    )
    session.add(contact)
    await session.commit()
    return contact


async def create_resume(session: AsyncSession, user_id: UUID4):
    resume = Resume(
        name="Test Resume",
        content="Test Content",
        content_type="custom",
        user_id=user_id,
    )
    session.add(resume)
    await session.commit()
    return resume


async def create_cover_letter(session: AsyncSession, user_id: UUID4):
    cover_letter = CoverLetter(
        name="Test Cover Letter",
        content="Test Content",
        content_type="custom",
        user_id=user_id,
    )
    session.add(cover_letter)
    await session.commit()
    return cover_letter
