#!/usr/bin/env python3
"""Compatibility wrapper around the agentic asset validator."""

from __future__ import annotations

import runpy
from pathlib import Path


if __name__ == "__main__":
    runpy.run_path(
        str(Path(__file__).with_name("validate_agentic_assets.py")),
        run_name="__main__",
    )
