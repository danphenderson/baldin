from operator import itemgetter
from typing import Any, Optional

from langchain.text_splitter import CharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_core.runnables import RunnableLambda
from langchain_openai import OpenAIEmbeddings

from app.extractor.extraction_runnable import (
    deduplicate,
    extraction_runnable,
    get_examples_from_extractor,
)
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
    """Extract from potentially long-form content."""
    if text_splitter_kwargs is None:
        text_splitter_kwargs = {
            "separator": "\n\n",
            "chunk_size": 1000,
            "chunk_overlap": 50,
        }
    text_splitter = CharacterTextSplitter(**text_splitter_kwargs)
    docs = text_splitter.create_documents([content])
    doc_contents = [doc.page_content for doc in docs]

    vectorstore = FAISS.from_texts(doc_contents, embedding=OpenAIEmbeddings())
    retriever = vectorstore.as_retriever()

    runnable = (
        {
            "text": itemgetter("query") | retriever,
            "schema": itemgetter("schema"),
            "instructions": lambda x: x.get("instructions"),
            "examples": lambda x: x.get("examples"),
            "llm_name": lambda x: x.get("llm_name"),
        }
        | RunnableLambda(_make_extract_requests)
        | extraction_runnable.abatch
    )
    schema = extractor.schema
    examples = get_examples_from_extractor(extractor)
    description = extractor.description  # TODO: improve this
    result = await runnable.ainvoke(
        {
            "query": description,
            "schema": schema,
            "examples": examples,
            "instructions": extractor.instruction,
            "llm_name": llm_name,
        }
    )
    return deduplicate(result)
