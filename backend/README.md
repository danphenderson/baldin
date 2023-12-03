# baldin

Inspired by (albiet not limited to):
- https://levelup.gitconnected.com/building-a-website-starter-with-fastapi-92d077092864#e696
- https://testdriven.io/courses/tdd-fastapi/

Baldin: http://127.0.0.1:8004

OpenAPI (re)docs: http://127.0.0.1:8004/docs | http://127.0.0.1:8004/redocs

Selenium grid: http://localhost:4444/ui
- Ref: https://github.com/SeleniumHQ/docker-selenium

FastAPI Users: https://fastapi-users.github.io/fastapi-users/10.4/


# Development

After cloning the respository, build the Python environment in
the `backend/` with [pipenv](https://pipenv.pypa.io/en/latest/)

    pipenv install --dev .

After referencing the `.env.example` file, create your own .env file.

Using docker-compose to build API services:

    docker-compose up --build

The API is now ready to run:

    pipenv run api
