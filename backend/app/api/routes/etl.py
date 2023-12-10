# app/api/routes/etl.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from app.api.deps import AsyncSession, get_async_session, get_etl_event, models, schemas

router: APIRouter = APIRouter()


@router.get("/events/{id}", status_code=202, response_model=schemas.ETLEventRead)
async def read_etl_event(etl_event: schemas.ETLEventRead = Depends(get_etl_event)):
    return etl_event


@router.get("/events", response_model=list[schemas.ETLEventRead])
async def read_etl_events(db: AsyncSession = Depends(get_async_session)):
    rows = await db.execute(select(models.ETLEvent))
    result = rows.scalars().all()
    if not result:
        raise HTTPException(status_code=404, detail="No ETL events found")
    return result
