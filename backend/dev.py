# Path: backend/dev.py
"""
A module to assist in development of the app.

This module utilizes the apps configuration settings and openai
API access to perform various tasks, e.g.
- Q/A chatbot
- Third-party Documentation search
- Generate code snippets
- Generate synthetic seed data

Usage is not intended to provide access to the app's API (see `cli.py`),
but to provide a CLI interface to aid in development purposes.
"""
from typer import Argument, Typer

from app.core.conf import openai, settings
