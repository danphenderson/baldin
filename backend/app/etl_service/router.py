from fastapi import APIRouter

from app.etl_service.schemas import CrawlRunExecuteRequest, CrawlRunExecuteResponse
from app.etl_service.service import execute_crawl_run

router = APIRouter()


@router.post("/internal/crawl-runs/execute", response_model=CrawlRunExecuteResponse)
async def execute_crawl_run_endpoint(
    payload: CrawlRunExecuteRequest,
) -> CrawlRunExecuteResponse:
    return await execute_crawl_run(payload)
