# project/app/models/tortoise.py

from tortoise import fields, models
from tortoise.contrib.pydantic.creator import pydantic_model_creator


class TextLead(models.Model):
    url = fields.TextField()
    lead = fields.TextField()
    created_at = fields.DatetimeField(auto_now_add=True)

    def __str__(self):
        return self.url


LeadSchema = pydantic_model_creator(TextLead)