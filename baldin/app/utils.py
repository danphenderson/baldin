
import re
import os.path
import markdown

from typing import List
from bs4 import BeautifulSoup
from aiofiles import open as aopen

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

def open_page(markdown):
    filepath = os.path.join("app/pages/", markdown)
    with open(filepath, "r", encoding="utf-8") as input_file:
        text = input_file.read()

    html = markdown.markdown(text)
    data = {
        "text": html
    }
    return data
  
async def aopenfile(filename):
    filepath = os.path.join("app/pages/", filename)
    async with aopen(filepath, "r", encoding="utf-8") as input_file:
        text = await input_file.read()
        html = markdown.markdown(text)
        data = {
            "text": html
        }
        return data
