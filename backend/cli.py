"""
This module provides a CLI interface to interact
with the app's API (and any other Backend services).

The CLI is intended to be used for testing and debugging
purposes, providing a thin wrapper around the app's API
"""
import json

import requests
from typer import Argument, Option, Typer

app = Typer()


class AutoCLI:
    # FIXME:
    # No idea if this works, threw together a quick implementation from an idea
    # - hardcoded paths
    # - add support for fetching the API spec from the backend (consider it to be the default thing to do)
    @classmethod
    def load_api_spec(cls):
        with open("../frontend/openapi.json", "r") as file:
            return json.load(file)

    @classmethod
    def create_command_function(cls, path, method, operation):
        def command_function(**kwargs):
            url = f"http:localhost:8004{path}"  # use BACKEND_CORS_ORIGINS?
            if method.lower() == "get":
                response = requests.get(url, params=kwargs)
            elif method.lower() == "post":
                response = requests.post(url, json=kwargs)
            # Add other methods as needed
            print(response.json())

        return command_function

    @classmethod
    def generate_cli_commands(cls, app, api_spec: dict):
        for path, methods in api_spec["paths"].items():
            for method, operation in methods.items():
                command_name = operation.get("operationId", f"{method}_{path}").replace(
                    "/", "_"
                )
                command_function = cls.create_command_function(path, method, operation)
                app.command(name=command_name)(command_function)


def main():
    api_spec = AutoCLI.load_api_spec()
    AutoCLI.generate_cli_commands(app, api_spec)
    app()


if __name__ == "__main__":
    main()
