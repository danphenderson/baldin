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


class OpenAPICLI:
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
            elif method.lower() == "put":
                response = requests.put(url, json=kwargs)
            elif method.lower() == "delete":
                response = requests.delete(url, json=kwargs)
            else:
                raise ValueError(f"Unsupported method: {method}")
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


class AutoCli:
    # This is another quick implementation, not sure if it works
    # The idea is to generate CLI from the app servers python code
    # Use case here is in the app servers envrionment, e.g. during development
    def __init__(self, app):
        self.app = app
        self.cli = Typer()
        self._generate_cli_commands()

    def _generate_cli_commands(self):
        for endpoint in self._get_api_endpoints():
            self.cli.command(name=endpoint["name"])(endpoint["handler"])

    def _get_api_endpoints(self):
        endpoints = []
        for rule in self.app.url_map.iter_rules():
            # Assuming 'rule' has attributes like 'endpoint' and 'methods'
            # Adjust according to your actual API's structure
            endpoints.append(
                {
                    "name": rule.endpoint,
                    "methods": rule.methods,
                    "handler": self._create_handler(rule),
                }
            )
        return endpoints

    def _create_handler(self, rule):
        def handler(*args, **kwargs):
            # Logic to call the API endpoint
            # For example, make an HTTP request to the actual endpoint
            print(f"Calling {rule.endpoint} with args {args} and kwargs {kwargs}")
            # You would replace this print with actual logic to call the endpoint
            pass

        return handler

    def run(self):
        self.cli()

    # Usage example
    # app = ...  # Your Flask/Django/FastAPI app instance
    # cli = AutoCli(app)
    # cli.run()


def main():
    api_spec = OpenAPICLI.load_api_spec()
    OpenAPICLI.generate_cli_commands(app, api_spec)
    app()


if __name__ == "__main__":
    main()
