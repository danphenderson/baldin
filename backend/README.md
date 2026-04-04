# Backend

The backend defines the Baldin API and the data ETL pipelines that power the API.


## Getting Started

To get started, create a `baldin/backend/.env` file for local development using the
`baldin/backend/.env.example` file with your `OPENAI_API_KEY` if you want to use
the extraction and automation features.


### API

The Baldin API is a restful JSON API that performs CRUD operations on the applications data model. The API is built with FastAPI and is powered by a PostgreSQL database.

TODO: Add a brief description of the API and how to run it


### Data Model

The API data model is centered on a `User` record and three related domains:

- candidate profile data such as contacts, skills, experience, education, resumes, and cover letters
- job search data such as companies, leads, applications, and their join tables
- automation data such as extractors, extractor examples, orchestration pipelines, and orchestration events

All entities inherit `id`, `created_at`, and `updated_at` from the shared `Base`
model in `app/models.py`. The `User` table also inherits authentication fields
from `SQLAlchemyBaseUserTableUUID`.

```mermaid
erDiagram
	USER {
		uuid id PK
		string first_name
		string last_name
		string phone_number
		string city
		string state
		string country
		string time_zone
		string avatar_uri
	}

	CONTACT {
		uuid id PK
		string first_name
		string last_name
		string phone_number
		string email
		string time_zone
		text notes
		uuid user_id FK
	}

	SKILL {
		uuid id PK
		string name
		string category
		int yoe
		string subskills
		uuid user_id FK
	}

	EXPERIENCE {
		uuid id PK
		string title
		string company
		string location
		datetime start_date
		datetime end_date
		uuid user_id FK
	}

	EDUCATION {
		uuid id PK
		string university
		string degree
		json activities
		json achievements
		datetime start_date
		datetime end_date
		uuid user_id FK
	}

	CERTIFICATE {
		uuid id PK
		string title
		string issuer
		datetime issued_date
		datetime expiration_date
		uuid user_id FK
	}

	RESUME {
		uuid id PK
		string name
		string content_type
		uuid user_id FK
	}

	COVER_LETTER {
		uuid id PK
		string name
		string content_type
		uuid user_id FK
	}

	COMPANY {
		uuid id PK
		string name
		string industry
		string size
		string location
	}

	LEAD {
		uuid id PK
		string url
		string title
		string location
		string salary
		string employment_type
		string seniority_level
		string education_level
		string hiring_manager
	}

	APPLICATION {
		uuid id PK
		string status
		uuid user_id FK
		uuid lead_id FK
	}

	LEAD_X_COMPANY {
		uuid lead_id PK, FK
		uuid company_id PK, FK
	}

	RESUME_X_APPLICATION {
		uuid application_id PK, FK
		uuid resume_id PK, FK
	}

	COVER_LETTER_X_APPLICATION {
		uuid application_id PK, FK
		uuid cover_letter_id PK, FK
	}

	EXTRACTOR {
		uuid id PK
		string name
		text description
		jsonb json_schema
		text instruction
		uuid user_id FK
	}

	EXTRACTOR_EXAMPLE {
		uuid id PK
		text content
		jsonb output
		uuid extractor_id FK
	}

	ORCHESTRATION_PIPELINE {
		uuid id PK
		string name
		text description
		json definition
		uuid user_id FK
	}

	ORCHESTRATION_EVENT {
		uuid id PK
		string status
		text message
		json payload
		string environment
		json source_uri
		json destination_uri
		uuid pipeline_id FK
	}

	USER ||--o{ CONTACT : has
	USER ||--o{ SKILL : has
	USER ||--o{ EXPERIENCE : has
	USER ||--o{ EDUCATION : has
	USER ||--o{ CERTIFICATE : has
	USER ||--o{ RESUME : owns
	USER ||--o{ COVER_LETTER : owns
	USER ||--o{ APPLICATION : submits
	USER ||--o{ EXTRACTOR : owns
	USER ||--o{ ORCHESTRATION_PIPELINE : owns

	LEAD ||--o{ APPLICATION : targets
	LEAD ||--o{ LEAD_X_COMPANY : links
	COMPANY ||--o{ LEAD_X_COMPANY : links

	APPLICATION ||--o{ RESUME_X_APPLICATION : links
	RESUME ||--o{ RESUME_X_APPLICATION : links

	APPLICATION ||--o{ COVER_LETTER_X_APPLICATION : links
	COVER_LETTER ||--o{ COVER_LETTER_X_APPLICATION : links

	EXTRACTOR ||--o{ EXTRACTOR_EXAMPLE : contains
	ORCHESTRATION_PIPELINE ||--o{ ORCHESTRATION_EVENT : records
```

When making changes to the data model, you can generate a new migration by running the following command:

```bash
alembic revision --autogenerate -m "Your migration message here"
```

After generating the migration, you can apply the migration to the database by running the following command:

```bash
alembic upgrade head
```


### Tests

The backend test suite stills needs to be built out. To run the tests, use the following command:

```bash
pipenv run test # or testv for verbose output
```

### ETL

The ETL is a collection of scripts that are used to extract data from various sources, transform the data into a common format, and load the data into the Application's datalake.


### Development Notes

TODO: Add development notes

Things to consider:
- [ ] Add a section on how to run the ETL scripts
- [ ] Add a section on how to run the API
- [ ] Add a section on how to run the tests


#### Ref:

There are a bunch of stealth playwriters in the world, all appearing to be unmaintained.

This is the latest attempt https://github.com/QIN2DIM/undetected-playwright
which references the one I am using


GlassDoor Scrapping:
https://iproyal.com/blog/scrape-data-from-glassdoor/

LinkedIn Scrapping:
https://www.scrapingbee.com/blog/scrape-linkedin/

Indeed Scapping:
https://iproyal.com/blog/scrape-data-from-glassdoor/
