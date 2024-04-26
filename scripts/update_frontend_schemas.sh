#!/bin/bash

# Check for changes in the specific Python modules in the staged files
CHANGED_FILES=$(git diff --cached --name-only | grep -E 'backend/app/schemas.py|backend/app/api/.*\.py')

# If changes are found, perform the tasks
if [[ ! -z "$CHANGED_FILES" ]]; then
    echo "Changes detected in API schemas. Updating OpenAPI and TypeScript definitions."

    # Fetch the latest OpenAPI JSON and check for success
    if curl http://127.0.0.1:8004/openapi.json -o openapi.json; then
        echo "Successfully fetched OpenAPI JSON."

        # Generate TypeScript definitions and check for success
        if npx openapi-typescript ./openapi.json -o ./frontend/src/schema.d.ts; then
            echo "Successfully generated TypeScript definitions."

            # Stage the updated files only if all operations were successful
            git add openapi.json ./frontend/src/schema.d.ts
        else
            echo "Failed to generate TypeScript definitions."
            exit 1
        fi
    else
        echo "Failed to fetch OpenAPI JSON."
        exit 1
    fi
else
    echo "No changes detected in API schemas."
fi
