#!/bin/bash

# Check for changes in the specific Python modules
CHANGED_FILES=$(git diff --name-only HEAD~1 | grep -E 'backend/app/schemas.py|backend/app/api/.*\.py')

# If changes are found, perform the tasks
if [[ ! -z "$CHANGED_FILES" ]]; then
    echo "Changes detected in API schemas. Updating OpenAPI and TypeScript definitions."

    # Fetch the latest OpenAPI JSON
    curl http://127.0.0.1:8004/openapi.json -o openapi.json

    # Generate TypeScript definitions
    npx openapi-typescript ./openapi.json -o ./frontend/src/schema.d.ts
else
    echo "No changes detected in API schemas."
fi
