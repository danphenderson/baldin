# app/utils.py

import re
from typing import List
from bs4 import BeautifulSoup

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

