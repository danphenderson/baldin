from app.core.chrome import Driver
from app.etl.models.job import Job
from app.etl.models.coverletter import CoverLetter
from app.etl.models.resume import Resume
from app.core import conf

class Application:
    
    def __init__(self, driver: Driver):
        self.driver = driver

    def prompt(self, role, content) -> dict[str, str]:
        return {"role": role, "content": content}

    def system_prompt(self) -> list[dict[str, str]]:
        # Returns message param in OpenAI's ChatCompletion API 
        return [
            self.prompt("system", "Hi! You are my helpful job application assistant."),
            self.prompt("assistant", "Hello! I'm ready to help, tell me what you need."),
        ]

    def parse_job_requirements_prompt(self, job: Job) -> list[dict[str, str]]:
        # Returns message param in OpenAI's ChatCompletion API
        prompt = self.system_prompt()
        prompt.append(self.prompt("user", f"Parse the following job post: {job.description}"))
        return prompt

    # async def parse_job_requirements(self, job: Job) -> Awaitable[str]:
    #     message = self.parse_job_requirements_prompt(job)
    #     return await self.driver.chat_completion(message, max_tokens=2000) 

    # def coverletter_template_prompt(self, job: Job) -> list[dict[str, str]]:
    #     # Returns message param in OpenAI's ChatCompletion API
    #     prompt = self.system_prompt()
    #     prompt.append(self.prompt("user", f'\nFill in the rest of my cover letter template:\nDear {job.hiring_manager},\n\nI am writing to express my interest in the {job.title} position at {job.company}. As an experienced professional AWS data platform engineer with a background in [List applicable Language, Framework, and AWS Service], I am qualified and interested in contributing to your team.\n\nIn my most recent role at Lucerna Health, I led the software development and research of cloud warehousing and ingestion solutions for their big-data platform. [Use job post to complete the paragraph].\n\n[Use job post to write a supporting paragraph].\n\nThank you for considering my application. I have attached my resume for your review, and I look forward to the opportunity to discuss my qualifications further.\n\nSincerely,\nDaniel Henderson\n\nUsing the following job post: {job.description}'))
    #     return prompt

    # async def coverletter_template(self, job: Job) -> Awaitable[CoverLetter]:
    #     message = self.coverletter_template_prompt(job)
    #     template = await self.driver.chat_completion(message, max_tokens=2000)
    #     return await self.driver.run_async(lambda: CoverLetter(template=template))  # type: ignore

    

    