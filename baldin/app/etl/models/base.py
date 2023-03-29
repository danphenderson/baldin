from abc import ABCMeta
from uuid import NAMESPACE_URL, uuid5
from pydantic import BaseModel as _BaseModel
from pydantic import AnyHttpUrl, Field, root_validator, UUID5
from asyncio import get_event_loop, ensure_future, Future, sleep
from pathlib import Path
from aiofiles import open as aopen

from typing import Dict

class BaseModel(_BaseModel, extra='allow', metaclass=ABCMeta):
    _tasks: list = []

    @staticmethod
    async def _run_sync(func, *args, **kwargs):
        loop = get_event_loop()
        return await loop.run_in_executor(None, func, *args, **kwargs)

    @classmethod
    async def load(cls, file_path: str):
        async with aopen(file_path, 'r') as f:
            data = await f.read()
            return await cls._run_sync(lambda: cls.parse_raw(data))

    async def run_async(self, func, *args, **kwargs) -> Future:
        task = ensure_future(self._run_sync(func, *args, **kwargs))
        self._tasks.append(task)
        return await task
    
    async def to_dict(self) -> Dict:
        return await self._run_sync(lambda: self.dict())

    async def to_json(self, indent: int = 4):
        return await self._run_sync(lambda: self.json(indent=indent))

    async def dump(self, file_path: str, indent: int = 4):
        Path(file_path).parent.mkdir(parents=True, exist_ok=True)
        async with aopen(file_path, 'a') as f:
            await f.write(await self.to_json(indent=indent))

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


class HRefBaseModel(BaseModel):
    url: AnyHttpUrl
    id: UUID5 | None = Field(default=None) # sha1 hash of url for unique id

    @root_validator
    def assign_id(cls, values):
        values["id"] = uuid5(NAMESPACE_URL, values.get("url", ""))
        return values

    def __eq__(self, other):
        if isinstance(other, str):
            return self.url == other
        elif isinstance(other, HRefBaseModel):
            return self.url == other.url
        return False

    def __ne__(self, other):
        return self.url != other.url