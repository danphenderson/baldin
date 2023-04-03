from app.etl.models.base import BaseModel


class Resume(BaseModel):
    header : str
    objective : str
    about : str
    experience : list[str]
    stack : list[str]
    education : list[str]
