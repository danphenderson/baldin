# Overview

Baldin helps navigate the modern job market.


Documentation is available at [https://baldin.readthedocs.io/en/latest/](https://baldin.readthedocs.io/en/latest/)


**Source Code**:  <a href="https://github.com/danphenderson/baldin" target="_blank">https://https://github.com/danphenderson/baldin</a>


## 🚧 Features 🚧

Currently, the application is in its infancy. The following features are
planned for the first release:

- [x] User authentication
- [ ] User registration
- [ ] User profile
- [ ] ETL pipeline for job data
- [ ] Job search
- [ ] Job finder
- [ ] Job lead manager
- [ ] Job application tracker
- [ ] Job application recommendation engine
- [ ] Google Calendar integration


### Feature/Bug Request

If you find a bug or have a feature request, please file an issue on the
repository's [issue tracker](https://github.com/danphenderson/baldin/issues)

# Contributing

Contributions are welcome!

### Getting Started

Ensure you have the following requirements installed:

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js](https://nodejs.org/en/download/)
- [TypeScript](https://www.typescriptlang.org/download)
- [pipenv](https://pipenv.pypa.io/en/latest/)
- [pyenv](`https://github.com/pyenv/pyenv#installation`) (or your preferred Python version manager) with Python 3.11.2


1. Fork the [repository](https://github.com/danphenderson) (look for the "Fork" button).


The following steps may serve as reference, outlining the process of making a contribution:

2. Clone your fork locally:
   `git clone git@github.com:YOURGITHUBNAME/python-chromex.git`

3. Create a branch for your changes:
    `git checkout -b <issue-number>-branch-name`

4. Make your changes and commit them:
   `git add . && git commit -m "Your message here"`

5. Push your changes to your fork:
    `git push origin <issue-number>-branch-name`

6. Open a pull request in the upstream repository (look for the "Pull Request" button).

7. Wait for your changes to be reviewed and merged!

### Development Stack

After cloning your forked version of the repository, spin up the development
stack with the following steps:

In the `backend/` directory:
   - Build your Python virtual-environment with [pipenv](https://pipenv.pypa.io/en/latest/): `pipenv install --dev .`
   - Using the `.env.example` file, create a .env file in the `backend/` directory.
   - Using docker-compose spin up the Postgres database: `docker-compose up --build`
   - Now The API is now ready to run: `pipenv run api`

In the `frontend/` directory:
   - Install the dependencies: `npm install`
   - Start the development server: `npm start`


## License

This project is licensed under the terms of the MIT license.
