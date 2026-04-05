---
sidebar_position: 2
slug: /architecture/data-model
title: Data Model
---

# Data Model

The API data model is centered on a `User` record and three related domains:

- **Candidate profile data:** contacts, skills, experience, education, resumes, and cover letters
- **Job search data:** companies, leads, applications, and their join tables
- **Automation data:** extractors, extractor examples, orchestration pipelines, and orchestration events

All entities inherit `id`, `created_at`, and `updated_at` from the shared `Base` model in `app/models.py`. The `User` table also inherits authentication fields from `SQLAlchemyBaseUserTableUUID`.

## Entity Relationship Diagram

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
		uuid lead_id PK_FK
		uuid company_id PK_FK
	}

	RESUME_X_APPLICATION {
		uuid application_id PK_FK
		uuid resume_id PK_FK
	}

	COVER_LETTER_X_APPLICATION {
		uuid application_id PK_FK
		uuid cover_letter_id PK_FK
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

	RESUME ||--o{ RESUME_X_APPLICATION : links
	APPLICATION ||--o{ RESUME_X_APPLICATION : links
	COVER_LETTER ||--o{ COVER_LETTER_X_APPLICATION : links
	APPLICATION ||--o{ COVER_LETTER_X_APPLICATION : links

	EXTRACTOR ||--o{ EXTRACTOR_EXAMPLE : has
	ORCHESTRATION_PIPELINE ||--o{ ORCHESTRATION_EVENT : produces
```

## Domain Groupings

### Candidate Profile

User-owned records that represent the candidate's professional identity:

- **Contact** — external contacts (recruiters, hiring managers)
- **Skill** — named skills with category, years of experience, and optional subskills
- **Experience** — work history entries with title, company, location, and date range
- **Education** — university records with degree, activities, and achievements
- **Certificate** — professional certifications with issuer and dates
- **Resume / Cover Letter** — uploaded documents keyed by name and content type

### Job Search

Entities that track the job search pipeline:

- **Company** — company records with industry, size, and location
- **Lead** — job opportunities with URL, title, salary, employment type, and seniority
- **Application** — user applications linking a user to a lead with a status
- **Lead×Company** — many-to-many association between leads and companies
- **Resume×Application / CoverLetter×Application** — documents attached to applications

### Automation

Configurable extraction and orchestration:

- **Extractor** — named extraction configs with a JSON schema and instruction
- **ExtractorExample** — sample input/output pairs for few-shot extraction
- **OrchestrationPipeline** — named pipeline definitions
- **OrchestrationEvent** — execution events with status, payload, and source/destination URIs

## Schema Management

The repo does not currently use Alembic migrations. Schema changes rely on SQLAlchemy `create_all` during startup bootstrap. See [Deployment Status](../engineering/deployment-status.md) for the implications of this approach.
