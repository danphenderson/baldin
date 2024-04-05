import json
from pathlib import Path

from app import schemas, utils
from app.core import conf, openai
from app.etl.base import Job
from app.logging import console_log


def get_leads_dir() -> Path:
    return Path(conf.settings.PUBLIC_ASSETS_DIR) / "leads"


async def enrich_lead(lead) -> Job:
    # Exit early if description is not set, as it is required for enrichment
    if not lead.description:
        return lead

    # Determin unset unset_fields
    unset_fields = [k for k, v in lead.__dict__.items() if v is None]

    # Generate unset fields from description
    messages = [
        {"role": "system", "content": "You excel at extracting information from text"},
        {
            "role": "user",
            "content": f"You will be given job lead's description and you will need to extract the following information: {unset_fields}",
        },
        {
            "role": "assistant",
            "content": f"After extracting the {unset_fields}, how should I present the information to you?",
        },
        {"role": "user", "content": "Please present the information in a JSON format"},
        {
            "role": "assistant",
            "content": f"Great, I will generate a JSON object containing {unset_fields} from the job lead's description",
        },
        {
            "role": "user",
            "content": f"Thank you! Here is the job lead's description: {lead.description}",
        },
    ]

    # Generate completion
    completion = await openai.chat_completion(
        model=conf.openai.COMPLETION_MODEL,
        messages=messages,
        stop=None,
    )

    try:
        completion_dict = json.loads(completion)
    except json.JSONDecodeError:
        return lead

    # Update the lead's attributes
    for var, value in completion_dict.items():
        if var in unset_fields:
            setattr(lead, var, value)

    return lead


async def enrich_leads():
    async for lead in utils.generate_pydantic_models_from_json(Job, get_leads_dir()):
        # Enrich lead
        enriched_lead = await enrich_lead(lead)  # type: ignore

        file_path = str(get_leads_dir() / "enriched" / f"{enriched_lead.id}.json")

        try:
            # Dump enriched lead
            await enriched_lead.dump(file_path=file_path)

        except Exception as e:
            console_log.exception(f"Error dumping enriched lead: {e}")
            continue
