# Path: etl/tests/conftest.py
"""
ETL test configuration.

ETL tests exercise pure-function logic and mocked browser interactions.
They do NOT require a database connection or the FastAPI application.
"""

import os

os.environ.setdefault("ENVIRONMENT", "PYTEST")
