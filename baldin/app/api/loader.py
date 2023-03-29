# app/api/datalake.py
"""
Routes to load the public assets bucket (datalake) into application database.
"""


from fastapi import APIRouter, HTTPException, BackgroundTasks



from app.api.crud import LoaderCRUD
from app.models.pydantic import LoaderResponseSchema
from app.logging import console_log, get_async_logger
from app import datalake

log = get_async_logger(__name__)

router = APIRouter()

@router.post("/", response_model=LoaderResponseSchema, status_code=201)
async def load_database(background_tasks: BackgroundTasks):
    loader = await LoaderCRUD.post()
    background_tasks.add_task(datalake.load, loader["id"]) 
    await log.debug(f"Posted datalake load: {loader}, with status code 201.")
    return loader


@router.get("/{loader_id}/", response_model=LoaderResponseSchema)
async def read_loader(loader_id: int):
    await log.info(f"Reading loader: {loader_id}")
    loader = await LoaderCRUD.get(loader_id)
    if not loader:
        console_log.error(f"Loader not found: {loader_id}")
        raise HTTPException(status_code=404, detail="Loader not found")
    await log.debug(f"Returning loader: {loader}")
    return loader


@router.get("/", response_model=list[LoaderResponseSchema])
async def read_loaders():
    await log.info("Reading all loaders")
    loaders = await LoaderCRUD.get_all()
    await log.debug(f"Returning loaders: {loaders}")
    return loaders