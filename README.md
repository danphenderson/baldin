# Overview

Baldin helps navigate the modern job market.
------

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


### Building and Running

After cloning your forked version of the repository, spin up the development stack with the following steps:

In the `backend/` directory:

   - Build your Python virtual-environment with [pipenv](https://pipenv.pypa.io/en/latest/): `pipenv install --dev .`

   - Using the `.env.example` file, create a .env file in the `backend/` directory.

   - Using docker-compose spin up the Postgres database: `docker-compose up --build`

   - Now The API is now ready to run: `pipenv run api`

In the `frontend/` directory:

   - Install the dependencies: `npm install`

   - Start the development server: `npm start`

### Local Network

Baldin: [API](http://127.0.0.1:8004) | [Frontend](http://localhost:3000/)
2
OpenAPI: [Swagger Documentation](http://127.0.0.1:8004/docs) | [(re)docs](http://127.0.0.1:8004/redocs)

### 5-steps to contributing

After finishing the above steps, you're ready to start contributing!

1. Create a branch for your changes: `git checkout -b <issue-number>-branch-name`

2. Make your changes and commit them:
   `git add . && git commit -m "Your message here"`

3. Push your changes to your fork:
    `git push origin <issue-number>-branch-name`

4. Open a pull request in the upstream repository (look for the "Pull Request" button).

5. Wait for your changes to be reviewed and merged!

### Futher Considerations

When modifying the API, generate the `frontend/schema.d.ts` using the openapi-typescript package:

`npx openapi-typescript ./openapi.json -o ./schema.d.ts`

Where `openapi.json` is the latest OpenAPI specification for the API.

**Generating new API Key**: `openssl rand -base64 32`

## License
This project is licensed under the terms of the [MIT license](/LICENSE).
