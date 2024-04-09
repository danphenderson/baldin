# app/utils.py

import json
import re
import textwrap
from io import BytesIO
from pathlib import Path
from typing import Any, Type

import aiofiles
from bs4 import BeautifulSoup
from fastapi import HTTPException
from jsonschema import exceptions
from jsonschema.validators import Draft202012Validator
from langchain_core.utils.json_schema import dereference_refs
from pydantic import BaseModel
from PyPDF2 import PdfReader


def clean_text(text: str) -> str:
    """
    Removes extra whitespace from a string of text.
    """
    cleaned = re.sub(r"\s+", " ", text).strip()
    starts_on_first_line = re.sub(r"^\n", "", cleaned)
    consistent_newlines = re.sub(r"\n+", "\n", starts_on_first_line)
    single_space_punctuation = re.sub(r"\s([,.!?;:])", r"\1", consistent_newlines)
    return single_space_punctuation


def wrap_text(text: str, width: int = 120) -> str:
    """
    Wraps text to a specified width.
    """
    return "\n".join(textwrap.wrap(text, width=width))


def split_soup_lines(soup: BeautifulSoup) -> list[str]:
    """
    Splits the HTML of the loaded source document into a list of strings.
    """
    return [line.strip() for line in soup.get_text().splitlines() if line.strip()]


def extract_soup_hrefs(soup: BeautifulSoup) -> list[str]:
    """
    Extracts all links from a BeautifulSoup object.
    """
    return [link.get("href") for link in soup.find_all("a") if link.get("href")]


# Asynchronous utils


async def generate_pydantic_models_from_json(
    model: Type[BaseModel], directory: str | Path
):
    """
    An asynchronous generator function to load JSON documents from a directory.
    """

    def _generate_pydantic_model_from_json(model, item):
        models = []
        if isinstance(item, list):
            for i in item:
                models.append(model(**i))
        else:
            models.append(model(**item))
        return models

    path = Path(directory) if not isinstance(directory, Path) else directory
    model_files = [p for p in path.glob("*.json") if path.is_dir()]
    model_files = model_files if model_files else [path]

    for path in model_files:
        async with aiofiles.open(path, mode="r") as f:
            doc = json.loads(await f.read())
            try:
                for model in _generate_pydantic_model_from_json(model, doc):
                    yield model
            except Exception as _:
                continue


async def dump_pydantic_model_to_json(model, destination: Path | str):
    """
    Dumps pydantic model to json
    """
    Path(destination).parent.mkdir(parents=True, exist_ok=True)
    async with aiofiles.open(destination, mode="a") as f:
        await f.write(json.dumps(model.__dict__, indent=4))


async def pdf_to_dict(pdf_path: str | Path) -> dict:
    """
    Loads the content of a PDF document and returns it as a dictionary.

    :param pdf_path: Path to the PDF file.
    :return: Dictionary representation of the PDF content.
    """
    # Ensure pdf_path is a Path object
    pdf_path = Path(pdf_path) if not isinstance(pdf_path, Path) else pdf_path
    if not pdf_path.exists():
        raise FileNotFoundError(f"File not found at {pdf_path}")

    # Read the PDF file asynchronously
    async with aiofiles.open(pdf_path, "rb") as file:
        content = await file.read()  # Read the entire file content

    # Use PdfReader with the read content
    reader = PdfReader(BytesIO(content))
    text_content = []

    # Extract text from each page
    for page_num in range(len(reader.pages)):
        page = reader.pages[page_num]
        text_content.append(page.extract_text())

    return {
        "content": text_content,
        "numPages": len(reader.pages),
        "name": str(pdf_path.stem),
    }


def generate_resources(filepath):
    """
    An  generator function to load a filepath resources.

    :param filepath: Path to the PDF file or directory of PDF files.
    """
    # Ensure filepath is a Path object
    filepath = Path(filepath) if not isinstance(filepath, Path) else filepath
    # Get a list of PDF files, if filepath is a single file, then len(model_files)==1
    model_files = [p for p in filepath.glob("*.pdf") if filepath.is_dir()]
    return model_files if model_files else [filepath]


"""Adapters to convert between different formats."""


def _rm_titles(kv: dict) -> dict:
    """Remove titles from a dictionary."""
    new_kv = {}
    for k, v in kv.items():
        if k == "title":
            continue
        elif isinstance(v, dict):
            new_kv[k] = _rm_titles(v)
        else:
            new_kv[k] = v
    return new_kv


# TODO: Rename function to be more descriptive
def update_json_schema(
    schema: dict,
    *,
    multi: bool = True,
) -> dict:
    """Add missing fields to JSON schema and add support for multiple records."""
    from app.logging import console_log

    if schema is None:
        console_log.error("Schema is None in update_json_schema.")
        raise ValueError("Schema cannot be None.")

    console_log.warning(f"Original schema in update_json_schema: {schema}")
    if multi:
        dereferenced_schema = dereference_refs(schema)
        # Ensure dereferenced_schema is valid before using it as 'items'
        if not isinstance(dereferenced_schema, dict):
            console_log.error(
                f"Expected a dictionary but got: {type(dereferenced_schema)}"
            )
            raise ValueError("The dereferenced schema should be a dictionary.")

        # Wrap the schema in an object called "Root" with a property called: "data"
        # which will be a json array of the original schema.
        schema_ = {
            "type": "object",
            "properties": {
                "data": {
                    "type": "array",
                    "items": dereferenced_schema,
                },
            },
            "required": ["data"],
        }
    else:
        raise NotImplementedError("Only multi is supported for now.")

    schema_["title"] = "extractor"
    schema_["description"] = "Extract information matching the given schema."

    from app.logging import console_log

    console_log.warning(f"Updated schema: {schema_}")
    return schema_


# TODO: Rename function to be more descriptive
def validate_json_schema(schema: dict[str, Any]) -> None:
    """Validate a JSON schema."""
    try:
        from app.logging import console_log

        console_log.warning(f"Validating schema: {schema}")
        Draft202012Validator.check_schema(schema)
    except exceptions.ValidationError as e:
        raise HTTPException(
            status_code=422, detail=f"Not a valid JSON schema: {e.message}"
        )
