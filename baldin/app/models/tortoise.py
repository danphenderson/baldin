# app/models/tortoise.py

from tortoise import fields, models

class BaseModel(models.Model):
    """An abstract base model that will include every system managed column."""
    id = fields.IntField(pk=True, generated=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        """Meta class."""
        abstract = True


class Lead(BaseModel):
    """A lead model, having a one-to-many relationship with Search."""
    url = fields.CharField(index=True, max_length=255)
    title = fields.CharField(max_length=255, null=True)
    company = fields.CharField(max_length=255, null=True)
    description = fields.TextField()
    location = fields.CharField(max_length=255, null=True)
    salary = fields.CharField(max_length=255, null=True)
    job_function = fields.CharField(max_length=255, null=True)
    industries = fields.CharField(max_length=255, null=True)
    employment_type = fields.CharField(max_length=255, null=True)
    seniority_level = fields.CharField(max_length=255, null=True)
    
    def __str__(self):
        return self.url

class Search(BaseModel):
    """A lead search model."""
    keywords = fields.CharField(index=True, max_length=255)
    platform = fields.CharField(index=True, max_length=255)

    def __str__(self):
        return self.keywords


class Loader(BaseModel):
    """A loader model, ..."""
    completed = fields.BooleanField(default=False, index=True)