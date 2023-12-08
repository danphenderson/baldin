# Data Model

### Brief Overview

Base: A base class from which other classes inherit. It includes id, created_at, and updated_at fields.

ETLEvent: Inherits from Base. Represents ETL (Extract, Transform, Load) events. Fields: job_name, status, error_message.

Lead: Inherits from Base. Represents leads. Fields include url, title, company, description, etc. It has a one-to-many relationship with Application.

Skill: Inherits from Base. Represents user skills. Fields: name, category, user_id. It has a many-to-one relationship with User.

Experience: Inherits from Base. Represents user experiences. Fields: title, company, start_date, end_date, description, user_id. It has a many-to-one relationship with User.

Application: Inherits from Base. Represents applications. Fields: cover_letter, status, lead_id, user_id. It has a many-to-one relationship with both User and Lead, and a many-to-many relationship with Resume and CoverLetter.

Contact: Inherits from Base. Represents contacts. Fields include first_name, last_name, phone_number, email, time_zone, notes, user_id. It has a many-to-one relationship with User.

Resume: Inherits from Base. Represents resumes. Fields: name, content, content_type, user_id. It has a many-to-one relationship with User and a many-to-many relationship with Application.

ResumeXApplication: Represents the many-to-many relationship between Resume and Application.

CoverLetter: Inherits from Base. Represents cover letters. Fields: name, content, content_type, user_id. It has a many-to-one relationship with User and a many-to-many relationship with Application.

CoverLetterXApplication: Represents the many-to-many relationship between CoverLetter and Application.

User: Inherits from SQLAlchemyBaseUserTableUUID and Base. Represents users. Fields include first_name, last_name, phone_number, address_line_1, etc. It has a one-to-many relationship with Application, Contact, Skill, Experience, Resume, and CoverLetter.
