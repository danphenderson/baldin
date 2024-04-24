# pull official base image
FROM python:3.11.2

# set working directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV PIPENV_VENV_IN_PROJECT false

# install system dependencies
RUN apt-get update \
  && apt-get -y install netcat gcc \
  && apt-get clean

# install python dependencies
RUN pip install --upgrade pip && pip install pipenv

# Copy the entire app folder into the container's working directory
COPY . .

# Install project dependencies from Pipfile.lock (ensuring reproducibility)
# Generate Pipfile.lock if it doesn't exist
RUN pipenv install --dev --system --deploy --ignore-pipfile --pre
