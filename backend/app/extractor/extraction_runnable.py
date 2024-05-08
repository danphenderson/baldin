# app/extractor/extraction_runnable.py

import json
from typing import Any, Sequence

from fastapi import HTTPException
from jsonschema import Draft202012Validator, exceptions
from langchain.text_splitter import TokenTextSplitter
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import chain
from pydantic import BaseModel, Field, validator

from app import schemas
from app.core import conf
from app.core.conf import openai, settings
from app.logging import console_log
from app.models import Extractor, ExtractorExample
from app.utils import update_json_schema, validate_json_schema


def _cast_example_to_dict(example: ExtractorExample) -> dict[str, Any]:
    """Cast example record to dictionary."""
    return {
        "text": example.content,
        "output": example.output,
    }


def _make_prompt_template(
    instructions: str | None,
    examples: Sequence[ExtractorExample] | None,
    function_name: str,
) -> ChatPromptTemplate:
    """Make a system message from instructions and examples."""
    prefix = (
        "You are a top-tier algorithm for extracting information from text. "
        "Only extract information that is relevant to the provided text. "
        "If no information is relevant, use the schema and output "
        "an empty list where appropriate."
    )
    if instructions:
        system_message = ("system", f"{prefix}\n\n{instructions}")
    else:
        system_message = ("system", prefix)
    prompt_components = [system_message]
    if examples is not None:
        few_shot_prompt = []
        for example in examples:
            # TODO: We'll need to refactor this at some point to
            # support other encoding strategies. The function calling logic here
            # has some hard-coded assumptions (e.g., name of parameters like `data`).
            function_call = {
                "arguments": json.dumps(
                    {
                        "data": example.output,
                    }
                ),
                "name": function_name,
            }
            few_shot_prompt.extend(
                [
                    HumanMessage(
                        content=getattr(example, "text", ""),
                    ),
                    AIMessage(
                        content="", additional_kwargs={"function_call": function_call}
                    ),
                ]
            )
        prompt_components.extend(few_shot_prompt)

    prompt_components.append(
        (
            "human",
            "I need to extract information from "
            "the following text: ```\n{text}\n```\n",
        ),  # type: ignore
    )
    return ChatPromptTemplate.from_messages(prompt_components)


# PUBLIC API


def deduplicate(
    extract_responses: list[schemas.ExtractorResponse],
) -> schemas.ExtractorResponse:
    """Deduplicate the results.

    The deduplication is done by comparing the serialized JSON of each of the results
    and only keeping the unique ones.
    """
    unique_extracted = []
    seen = set()
    for response in extract_responses:
        for data_item in response["data"]:
            # Serialize the data item for comparison purposes
            serialized = json.dumps(data_item, sort_keys=True)
            if serialized not in seen:
                seen.add(serialized)
                unique_extracted.append(data_item)

    return {
        "data": unique_extracted,  # type: ignore
    }


def get_examples_from_extractor(
    extractor: schemas.ExtractorRead,
) -> list[dict[str, Any]]:
    """Get examples from an extractor."""
    return [
        _cast_example_to_dict(example) for example in getattr(extractor, "examples", [])
    ]


@chain
async def extraction_runnable(
    extraction_request: schemas.ExtractorRequest,
) -> schemas.ExtractorResponse:
    """An end point to extract content from a given text object."""
    # TODO: Add validation for model context window size
    console_log.warning(f"Extraction request: {extraction_request}")
    schema = extraction_request.json_schema
    console_log.warning(f"Original schema in extract_from_content: {schema}")
    if schema is None:
        console_log.error("No schema found for the extractor.")
        raise HTTPException(status_code=400, detail="Extractor schema is missing.")
    schema = update_json_schema(getattr(extraction_request, "json_schema", {}))
    console_log.warning(f"Extracting to schema: {schema}")
    try:
        Draft202012Validator.check_schema(schema)
    except exceptions.ValidationError as e:
        raise HTTPException(status_code=422, detail=f"Invalid schema: {e.message}")

    prompt = _make_prompt_template(
        getattr(extraction_request, "instructions", None),
        getattr(extraction_request, "examples", None),
        schema["title"],
    )
    model = openai.get_model(getattr(extraction_request, "llm_name", None))
    # N.B. method must be consistent with examples in _make_prompt_template
    runnable = (
        prompt | model.with_structured_output(schema=schema, method="function_calling")
    ).with_config({"run_name": "extraction"})

    return await runnable.ainvoke({"text": extraction_request.text})  # type: ignore


async def extract_entire_document(
    content: str,
    extractor: schemas.ExtractorRead,
    llm_name: str,
) -> schemas.ExtractorResponse:
    """Extract from entire document."""
    json_schema = getattr(extractor, "json_schema", {})
    console_log.warning(f"Extracting to schema: {json_schema}")

    examples = get_examples_from_extractor(extractor)
    text_splitter = TokenTextSplitter(
        chunk_size=openai.get_chunk_size(llm_name),
        chunk_overlap=20,
        model_name=openai.DEFAULT_MODEL,
    )
    texts = text_splitter.split_text(content)
    console_log.warning(f"Extracting from {len(texts)} chunks")
    extraction_requests = [
        schemas.ExtractorRequest(
            text=text,
            schema=json_schema,
            instructions=extractor.instruction,  # TODO: consistent naming
            examples=examples,
            llm_name=llm_name,  # type: ignore
        )
        for text in texts
    ]

    # Limit the number of chunks to process
    if len(extraction_requests) > settings.MAX_CHUNKS and settings.MAX_CHUNKS > 0:
        content_too_long = True
        extraction_requests = extraction_requests[: settings.MAX_CHUNKS]
    else:
        content_too_long = False

    # Run extractions which may potentially yield duplicate results
    extract_responses: Sequence[
        schemas.ExtractorResponse
    ] = await extraction_runnable.abatch(
        extraction_requests, {"max_concurrency": settings.MAX_CONCURRENCY}
    )
    # Deduplicate the results
    return {
        "data": deduplicate(extract_responses)["data"],
        "content_too_long": content_too_long,  # type: ignore
    }
