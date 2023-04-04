
# app/models/base.py


from pydantic import BaseModel
from datetime import datetime
from uuid import uuid4
from fastapi_users import models
from pydantic import UUID4, EmailStr, Field, BaseModel


class _Config:
    extra = "allow"
    abstract = True

class BaseRead(BaseModel):
    id: int | str
    created_at: datetime
    updated_at: datetime

    class Config(_Config):
        pass


class BaseWrite(BaseModel):
    id: int | str | None = None

    class Config(_Config):
        pass