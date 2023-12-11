# app/utils.py

import json
import re
import textwrap
from pathlib import Path
from typing import List, Type

import aiofiles
from bs4 import BeautifulSoup
from pydantic import BaseModel, InstanceOf


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


def split_soup_lines(soup: BeautifulSoup) -> List[str]:
    """
    Splits the HTML of the loaded source document into a list of strings.
    """
    return [line.strip() for line in soup.get_text().splitlines() if line.strip()]


def extract_soup_hrefs(soup: BeautifulSoup) -> List[str]:
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
            except Exception as e:
                continue


async def dump_pydantic_model_to_json(model, destination: Path | str):
    """
    Dumps pydantic model to json
    """
    Path(destination).parent.mkdir(parents=True, exist_ok=True)
    async with aiofiles.open(destination, mode="a") as f:
        await f.write(json.dumps(model.__dict__, indent=4))
