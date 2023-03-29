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
    loader_id, created_at, updated_at = await LoaderCRUD.post()
    await log.debug(f"Created loader: {loader_id} at {created_at}. Starting background task to load database...")
    background_tasks.add_task(datalake.load, loader_id) 
    resp_obj =  {"id": loader_id, "created_at": created_at, "updated_at": updated_at}
    await log.debug(f"Returning response object: {resp_obj}, with status code 201.")
    return resp_obj


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