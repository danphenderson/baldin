# app/models/tortoise.py

from tortoise import fields, models
from tortoise.contrib.pydantic.creator import pydantic_model_creator


class BaseModel(models.Model):
    """An abstract base model that will include every system managed column."""
    id = fields.IntField(pk=True, generated=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        """Meta class."""
        abstract = True


class Search(BaseModel):
    """A lead search model."""
    keywords = fields.CharField(index=True, max_length=255)
    platform = fields.CharField(index=True, max_length=255)

    def __str__(self):
        return self.keywords


class Lead(BaseModel):
    """A lead model, having a one-to-many relationship with Search."""
    url = fields.CharField(index=True, max_length=255)
    search = fields.ForeignKeyField("models.Search", related_name="leads") # type: ignore
    title = fields.CharField(max_length=255)
    company = fields.CharField(max_length=255)
    description = fields.TextField()

    def __str__(self):
        return self.url    


SearchSchema = pydantic_model_creator(Search)


LeadSchema = pydantic_model_creator(Lead)


