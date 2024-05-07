# Overview

Streamline your journey to employment with Baldin.
------


Baldin is a platform that helps you find job opportunities, build and manage your applications, and prepare for interviews.


Documentation is available at [https://danphenderson.github.io/baldin/](https://danphenderson.github.io/baldin/)


**Source Code**:  <a href="https://github.com/danphenderson/baldin" target="_blank">https://https://github.com/danphenderson/baldin</a>


## 🚧 Features + Bugs 🚧

Currently, the application is in its infancy. See open issues for a list of planned features and known bugs. If you find a bug, have a feature request, or simply a question, please file an issue.

[issue tracker](https://github.com/danphenderson/baldin/issues)

# Contributing

Contributions are welcome! The frontend is built with React and the backend is built with FastAPI. The API is powered by a Postgres database.

Currently the frontend of the application needs to get up to speed with the backend. The backend is in a good place to start building out the frontend.

### Getting Started

Ensure you have the following requirements installed:

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js](https://nodejs.org/en/download/)
- [TypeScript](https://www.typescriptlang.org/download)
- [pipenv](https://pipenv.pypa.io/en/latest/)
- [pyenv](`https://github.com/pyenv/pyenv#installation`) (or your preferred Python version manager) with Python 3.11.2


Fork the [repository](https://github.com/danphenderson) (look for the "Fork" button).

Then clone your fork locally: `git clone git@github.com:YOURGITHUBNAME/baldin.git`


### Local Network

Baldin: [API](http://localhost:8000) | [Frontend](http://localhost:3000/) | [Admin](http://localhost:8004/admin)

OpenAPI Documentation: [Swagger](http://localhost:8004/docs) | [(Re)docs](http://localhost:8004/redocs)


### Building and Running

After cloning your forked version of the repository, spin up the development stack with the following steps:

1. Use `backend/.env.example` to create `backend/.env` with a valid `OPEN_API_KEY`
2. In the root of the reposity run `docker-compose up --build`

### 5-steps to contributing

After running Baldin locally, you're ready to start contributing!

1. Create a branch for your changes: `git checkout -b <issue-number>-branch-name`

2. Make your changes and commit them:
   `git add . && git commit -m "Your message here"`

3. Push your changes to your fork:
    `git push origin <issue-number>-branch-name`

4. Open a pull request in the upstream repository (look for the "Pull Request" button).

5. Wait for your changes to be reviewed and merged!

*Note*: before committing changes for the first time, run  `pre-commit install` in the root of the repository.

### Futher Considerations

- Commiting modifications to the API endpoints and schemas trigger  `scripts/fronted_update_schemas.sh` hook to update `openapi.json` and `frontend/src/schemas.d.ts`.

- Generating new API Keys: `openssl rand -base64 32`

## License
This project is licensed under the terms of the [MIT license](/LICENSE).
