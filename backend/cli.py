"""
This module provides a CLI interface to interact
with the app's API (and any other Backend services).

The CLI is intended to be used for testing and debugging
purposes, providing a thin wrapper around the app's API
"""
from typer import Typer


class AutoCli:
    def __init__(self, app):
        self.app = app
        self.cli = Typer()

    def run(self):
        self.cli()


# TODO: Create a way to automate creation of CLI
#   commands from the app's API specs, i.e. frontend/openapi.json
