import asyncio
import json
import logging
from logging.handlers import TimedRotatingFileHandler
from pathlib import Path
from app import conf

class AsyncJSONFileLogger:
    def __init__(
        self,
        name,
        filepath,
        backupcount=5,
        interval='D',
        encoding='utf-8'
    ):  
        self.logger = logging.getLogger(name)
        self.logger.setLevel(conf.settings.log_level)
        self.filepath = filepath
        formatter = logging.Formatter('{"levelname": "%(levelname)s", "message": "%(message)s", "asctime": "%(asctime)s", "process_id": "%(process)s", "thread_id": "%(thread)s"}')  # noqa: E501
        handler = TimedRotatingFileHandler(
            filepath, backupCount=backupcount, when=interval, encoding=encoding
        )
        handler.setFormatter(formatter)
        self.logger.addHandler(handler)

    async def log(self, level, msg, *args, **kwargs):
        async with _lock:
            getattr(self.logger, level)(msg, *args, **kwargs)

    async def debug(self, msg, *args, **kwargs):
        await self.log("debug", msg, *args, **kwargs)

    async def info(self, msg, *args, **kwargs):
        await self.log("info", msg, *args, **kwargs)

    async def warning(self, msg, *args, **kwargs):
        await self.log("warning", msg, *args, **kwargs)

    async def error(self, msg, *args, **kwargs):
        await self.log("error", msg, *args, **kwargs)

    async def critical(self, msg, *args, **kwargs):
        await self.log("critical", msg, *args, **kwargs)

    async def read(self):
        async with _lock:
            with open(self.filepath, 'r') as f:
                return json.load(f)
          

_lock = asyncio.Lock()

def get_async_logger(
    name,
    backupcount=None,
    interval='D',
    encoding='utf-8'
) -> AsyncJSONFileLogger:
    backupcount = backupcount or 5
    filepath = Path(conf.settings.public_asset_path) / f"{conf.settings.log_file_name}.json"
    if not filepath.exists():
        filepath.parent.mkdir(parents=True, exist_ok=True)
    return AsyncJSONFileLogger(
        name, str(filepath), backupcount, interval, encoding
    )


console_log = logging.getLogger("uvicorn")