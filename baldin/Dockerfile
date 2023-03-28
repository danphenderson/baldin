# pull official base image
FROM python:3.10.6-slim-buster


# set environment variables, prevents Python from:
#   - writing pyc files to disc (equivalent to python -B option)
#   - buffering stdout and stderr (equivalent to python -u option)
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# install system dependencies
RUN apt-get update && \
  apt-get -y install netcat gcc wget && \
  apt-get clean && \
  apt-get install openjdk-11-jdk -y
  # TODO: need to install a chrome driver


# set working directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# install python dependencies
RUN pip install --upgrade pip && pip install pipenv
COPY Pipfile .
COPY Pipfile.lock .
RUN PIPENV_VENV_IN_PROJECT=1 pipenv install --deploy --system

# add app
COPY . .

# add entrypoint.sh
COPY ./entrypoint.sh .
RUN chmod +x /usr/src/app/entrypoint.sh

# run entrypoint.sh
ENTRYPOINT ["/usr/src/app/entrypoint.sh"]