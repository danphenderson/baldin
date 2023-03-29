# app/utils.py

import re
import os.path
import markdown
from pathlib import Path
from typing import List
from bs4 import BeautifulSoup
from aiofiles import open as aopen

def read_page(markdown_file):
    filepath = os.path.join("app/pages/", markdown_file)
    with open(filepath, "r", encoding="utf-8") as input_file:
        text = input_file.read()
        html = markdown.markdown(text)
        data = {
            "text": html
        }
        return data
  
async def read_page_async(filename):
    filepath = str(Path("app") / "pages" / filename)
    async with aopen(filepath, "r", encoding="utf-8") as input_file:
        text = await input_file.read()
        html = markdown.markdown(text)
        data = {
            "text": html
        }
        return data


def clean_text(text:str) -> str:
    """
    Removes extra whitespace from the HTML of the loaded source document.
    """
    return re.sub(r'\s+', ' ', text)


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

