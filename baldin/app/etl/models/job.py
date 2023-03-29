from app.etl.models.base import HRefBaseModel


class Job(HRefBaseModel):
    description: str
    title: str | None = None
    company: str | None = None
    location: str | None = None
    salary: str | None = None
    seniority_level: str | None = None
    employment_type: str | None = None
    job_function: str | None = None
    industries: str | None = None
    hiring_manager: str | None = None
   