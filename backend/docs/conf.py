# -*- coding: utf-8 -*-
import sys
import tomllib
from pathlib import Path

import sphinx_py3doc_enhanced_theme

DOCS_DIR = Path(__file__).resolve().parent
BACKEND_DIR = DOCS_DIR.parent
REPO_ROOT = BACKEND_DIR.parent
PYPROJECT = tomllib.loads((BACKEND_DIR / "pyproject.toml").read_text(encoding="utf-8"))

sys.path.insert(0, str(BACKEND_DIR))
sys.path.insert(0, str(REPO_ROOT))


extensions = [
    "sphinx.ext.autodoc",
    "sphinx.ext.autosummary",
    "sphinx.ext.coverage",
    "sphinx.ext.doctest",
    "sphinx.ext.extlinks",
    "sphinx.ext.ifconfig",
    "sphinx.ext.napoleon",
    "sphinx.ext.todo",
    "sphinx.ext.viewcode",
]
source_suffix = ".rst"
master_doc = "index"
project = "Baldin"
year = "2026"
author = "Daniel P. Henderson"
copyright = "{0}, {1}".format(year, author)
version = release = PYPROJECT["project"]["version"]

pygments_style = "trac"
templates_path = ["."]
extlinks = {
    "issue": ("https://github.com/danphenderson/baldin/issues/%s", "#"),
    "pr": ("https://github.com/danphenderson/baldin/pull/%s", "PR #"),
}
html_theme = "sphinx_py3doc_enhanced_theme"
html_theme_path = [sphinx_py3doc_enhanced_theme.get_html_theme_path()]
html_theme_options = {
    "githuburl": "https://github.com/danphenderson/baldin/",
}

html_use_smartypants = True
html_last_updated_fmt = "%b %d, %Y"
html_split_index = False
html_sidebars = {
    "**": ["searchbox.html", "globaltoc.html", "sourcelink.html"],
}
html_short_title = "%s-%s" % (project, version)
html_title = "Baldin Developer Preview Docs"

napoleon_use_ivar = True
napoleon_use_rtype = False
napoleon_use_param = False


# Intersphinx configuration
intersphinx_mapping = {
    "python": ("https://docs.python.org/3", None),
    "selenium": ("https://selenium-python.readthedocs.io/", None),
    # You can add more mappings for other projects here
}
