# Path: backend/dev.py
"""
A module to assist in development of the app.

This module utilizes the apps configuration settings and openai
API access to perform various tasks, e.g.
- Q/A chatbot
- Third-party Documentation search
- Generate code snippets
- Generate synthetic seed data
"""
from typer import Argument, Typer

from app.core.conf import openai, settings
