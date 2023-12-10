# app/utils.py

import json
import re
from pathlib import Path
from typing import List

import aiofiles
from bs4 import BeautifulSoup


def clean_text(text: str) -> str:
    """
    Removes extra whitespace from the HTML of the loaded source document.
    """
    return re.sub(r"\s+", " ", text)


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


async def generate_json_documents(directory: str | Path):
    """
    An asynchronous generator function to load JSON documents from a directory.
    """
    directory_path = Path(directory) if not isinstance(directory, Path) else directory
    for path in directory_path.glob("*.json"):
        async with aiofiles.open(path, mode="r") as f:
            doc = json.loads(await f.read())
            yield doc
