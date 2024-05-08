# pull official base image
FROM python:3.11-slim-bookworm as base

# set environment variables bytecode generation and needlessly buffering
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# create working directory for app
RUN mkdir -p /home/backend/

# set the build working directory
WORKDIR /home/backend/

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends netcat-traditional gcc postgresql-client \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --upgrade pip

# Dependency image
FROM base as dependencies

# Copy the Pipfile and Pipfile.lock into the image
COPY Pipfile Pipfile.lock ./

# Install Python dependencies
RUN pip install pipenv \
    && pipenv install --system --deploy --ignore-pipfile

# Install Playwright for browser automation
RUN playwright install && playwright install-deps

# Final stage
FROM base as fina

# Copy virtual environment from dependencies stage
COPY --from=dependencies /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=dependencies /usr/local/bin /usr/local/bin


# Set environment variables specific to the application
ENV HOME=/home/ \
    APP_HOME=/home/backend/ \
    TERM=xterm-256color


# Set working directory
WORKDIR $APP_HOME

# Copy application code (and other necessary files) to container
COPY . .

# Set command to run the application using gunicorn with Uvicorn workers
CMD ["uvicorn", "app.main:app", "--reload", "--workers", "2", "--host", "0.0.0.0", "--port", "8000"]
