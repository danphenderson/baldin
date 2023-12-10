from asyncio import Future, ensure_future, get_event_loop, sleep
from pathlib import Path

from aiofiles import open as aopen

from app import schemas
from app.core.conf import settings


class AsyncBaseModel(schemas.BaseModel, extra="allow"):
    _tasks: list = []

    @staticmethod
    async def _run_sync(func, *args, **kwargs):
        loop = get_event_loop()
        return await loop.run_in_executor(None, func, *args, **kwargs)

    @classmethod
    async def load(cls, file_path: str):
        async with aopen(file_path, "r") as f:
            data = await f.read()
            return await cls._run_sync(lambda: cls.parse_raw(data))

    async def run_async(self, func, *args, **kwargs) -> Future:
        task = ensure_future(self._run_sync(func, *args, **kwargs))
        self._tasks.append(task)
        return await task

    async def to_dict(self) -> dict:
        return await self._run_sync(lambda: self.__dict__)

    async def dump(self, file_path: str, indent: int = 4):
        Path(file_path).parent.mkdir(parents=True, exist_ok=True)
        async with aopen(file_path, "a") as f:
            await f.write(self.json())

    async def wait(self, seconds: int) -> None:
        if seconds > 0:
            await sleep(seconds)

    async def __aenter__(self):
        # Ref: https://peps.python.org/pep-0492/#asynchronous-context-managers-and-async-with
        return self

    async def __aexit__(self, exc_type, exc_value, traceback) -> None:
        # Ref: https://peps.python.org/pep-0492/#asynchronous-context-managers-and-async-with
        pass

    async def __await__(self):
        return self._run_sync(lambda: self).__await__()


class Job(AsyncBaseModel, schemas.LeadCreate):
    async def dump(self, file_path: str):
        return await super().dump(
            file_path=file_path,
        )
