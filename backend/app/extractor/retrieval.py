# app/extractor/retrieval.py
from operator import itemgetter
from typing import Any, Optional

from fastapi import HTTPException
from langchain.text_splitter import CharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_core.runnables import RunnableLambda
from langchain_openai import OpenAIEmbeddings

from app.extractor.extraction_runnable import (
    deduplicate,
    extraction_runnable,
    get_examples_from_extractor,
)
from app.logging import console_log
from app.models import Extractor
from app.schemas import ExtractorRequest, ExtractorResponse


def _make_extract_requests(input_dict: dict[str, Any]) -> list[ExtractorRequest]:
    docs = input_dict.pop("text")
    return [ExtractorRequest(text=doc.page_content, **input_dict) for doc in docs]


async def extract_from_content(
    content: str,
    extractor: Extractor,
    llm_name: str,
    *,
    text_splitter_kwargs: Optional[dict[str, Any]] = None,
) -> ExtractorResponse:
    console_log.warning(f"Extracting from content: {content}")
    console_log.warning(f"Extractor: {extractor}")
    console_log.warning(f"LLM: {llm_name}")

    if text_splitter_kwargs is None:
        text_splitter_kwargs = {
            "separator": "\n\n",
            "chunk_size": 1000,
            "chunk_overlap": 50,
        }
    text_splitter = CharacterTextSplitter(**text_splitter_kwargs)
    docs = text_splitter.create_documents([content])
    doc_contents = [doc.page_content for doc in docs]

    console_log.warning(f"Extracting from {len(docs)} chunks")

    vectorstore = FAISS.from_texts(doc_contents, embedding=OpenAIEmbeddings())
    retriever = vectorstore.as_retriever()

    runnable = (
        {
            "text": itemgetter("query") | retriever,
            "schema": itemgetter("schema"),
            "instructions": lambda x: x.get("instructions"),
            "examples": lambda x: x.get("examples"),
            "model_name": lambda x: x.get("llm_name"),
        }
        | RunnableLambda(_make_extract_requests)
        | extraction_runnable.abatch
    )

    schema = extractor.json_schema
    examples = get_examples_from_extractor(extractor)
    description = extractor.description or ""
    invoke_data = {
        "query": description,
        "schema": schema,
        "examples": examples,
        "instructions": extractor.instruction,
        "model_name": llm_name,
    }

    console_log.warning(f"Invoke data: {invoke_data}")

    console_log.warning(
        f"Extractor details: ID={extractor.id}, Description={extractor.description}, Schema={extractor.json_schema}"
    )
    if not extractor.json_schema:
        console_log.error("Extractor schema is missing.")
        raise HTTPException(status_code=400, detail="Extractor schema is missing.")

    result = await runnable.ainvoke(invoke_data)

    console_log.warning(f"Result: {result}")

    deduped_res = deduplicate(result)

    console_log.warning(f"Deduped result: {deduped_res}")

    return deduped_res
