import json
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any

from aiofiles import open as aopen
from fastapi import BackgroundTasks, HTTPException
from pydantic import UUID4

from app.api.deps import (
    AsyncSession,
    conf,
    create_orchestration_event,
    create_orchestration_pipeline,
    get_orchestration_pipeline_by_name,
    models,
    schemas,
)
from app.core.db import session_context
from app.logging import console_log as log

SeedCreateCallable = Callable[
    [dict[str, Any], AsyncSession, models.User], Awaitable[Any]
]


@dataclass(frozen=True)
class SeedOperation:
    pipeline_name: str
    resource_name: str
    seed_filename: str
    destination_table: str
    creator: SeedCreateCallable

    @property
    def seed_path(self):
        return conf.settings.SEEDS_PATH / self.seed_filename

    @property
    def description(self) -> str:
        return f"Seed {self.resource_name} table with initial data"


def build_seed_poll_url(event_id: UUID4) -> str:
    return f"/data_orchestration/events/{event_id}"


def build_user_seed_creator(
    schema_type: type[schemas.BaseSchema],
    create_fn: Callable[..., Awaitable[Any]],
) -> SeedCreateCallable:
    async def _create(
        record: dict[str, Any],
        db: AsyncSession,
        user: models.User,
    ) -> Any:
        return await create_fn(schema_type(**record), db=db, user=user)

    return _create


async def _run_seed_operation(
    operation: SeedOperation,
    event_id: UUID4,
    user_id: UUID4,
) -> None:
    async with session_context() as db:
        event = await db.get(models.OrchestrationEvent, event_id)
        if event is None:
            log.error(
                f"Skipping seed operation {operation.pipeline_name}: event {event_id} not found"
            )
            return

        try:
            user = await db.get(models.User, user_id)
            if user is None:
                raise RuntimeError(f"User {user_id} not found for seed operation")

            event.status = schemas.OrchestrationEventStatusType.RUNNING
            await db.commit()

            async with aopen(operation.seed_path, "r") as file_handle:
                seed_data = json.loads(await file_handle.read())

            for record in seed_data:
                await operation.creator(record, db, user)
        except Exception as exc:
            log.exception(f"Error seeding {operation.resource_name} table: {exc}")
            event.status = schemas.OrchestrationEventStatusType.FAILED
            event.message = str(exc)
            await db.commit()
            return

        event.status = schemas.OrchestrationEventStatusType.SUCCESS
        event.message = (
            f"Seeded {operation.resource_name} table with {len(seed_data)} records."
        )
        await db.commit()
        log.info(event.message)


async def schedule_seed_operation(
    background_tasks: BackgroundTasks,
    db: AsyncSession,
    user: schemas.UserRead,
    operation: SeedOperation,
) -> schemas.SeedOperationAccepted:
    log.info(
        f"Seeding {operation.resource_name} table with initial data from {operation.seed_path}"
    )

    try:
        pipeline = await get_orchestration_pipeline_by_name(
            operation.pipeline_name, db, user
        )
    except HTTPException as exc:
        if exc.status_code != 404:
            raise
        log.warning(f"{operation.pipeline_name} pipeline not found, creating a new one")
        pipeline = await create_orchestration_pipeline(
            schemas.OrchestrationPipelineCreate(
                name=operation.pipeline_name,
                description=operation.description,
                definition={
                    "action": f"Insert initial data into {operation.resource_name} table"
                },
            ),
            user,
            db,
        )

    event = await create_orchestration_event(
        schemas.OrchestrationEventCreate(
            message=f"Seeding {operation.resource_name} table with initial data",
            environment=conf.settings.ENVIRONMENT,
            pipeline_id=pipeline.id,
            status=schemas.OrchestrationEventStatusType.PENDING,
            payload={},
            source_uri=schemas.URI(
                name=str(operation.seed_path),
                type=schemas.URIType.FILE,
            ),
            destination_uri=schemas.URI(
                name=f"{conf.settings.DEFAULT_SQLALCHEMY_DATABASE_URI}#{operation.destination_table}",
                type=schemas.URIType.DATABASE,
            ),
        ),
        db=db,
    )
    background_tasks.add_task(_run_seed_operation, operation, event.id, user.id)

    return schemas.SeedOperationAccepted(
        event_id=event.id,
        pipeline_id=pipeline.id,
        status=schemas.OrchestrationEventStatusType.PENDING,
        poll_url=build_seed_poll_url(event.id),
    )
