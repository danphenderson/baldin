
from pydantic import root_validator
from app.conf import settings
from app.etl.models.base import BaseModel
from app.etl.models.job import Job
from pathlib import Path

class CoverLetter(BaseModel):
    template: str