# Path: app/logging.py

import asyncio
import json
import logging
import sys
from datetime import datetime, timezone
from logging.handlers import TimedRotatingFileHandler
from pathlib import Path

from app.core import conf
from app.core.correlation_id import correlation_id

if conf.settings.ENVIRONMENT == "DEV":
    logging.basicConfig(
        stream=sys.stdout,
        format="%(name)s|%(levelname)s: %(message)s",
        level="ERROR",
    )


class StructuredJSONFormatter(logging.Formatter):
    """Produce a single JSON object per log record.

    Every record includes the correlation ID for the active request (empty
    string when logged outside a request context).
    """

    def format(self, record: logging.LogRecord) -> str:
        log_entry: dict = {
            "timestamp": datetime.fromtimestamp(
                record.created, tz=timezone.utc
            ).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "correlation_id": correlation_id.get(""),
            "process_id": record.process,
            "thread_id": record.thread,
        }
        if record.exc_info and record.exc_info[1] is not None:
            log_entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_entry)


class AsyncJSONFileLogger:
    def __init__(self, name, filepath, backupcount=5, interval="D", encoding="utf-8"):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(conf.settings.LOGGING_LEVEL)
        self.filepath = filepath
        if not conf.settings.SHOULD_LOG_API_TO_FILE:
            return
        handler = TimedRotatingFileHandler(
            filepath, backupCount=backupcount, when=interval, encoding=encoding
        )
        handler.setFormatter(StructuredJSONFormatter())
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

    async def exception(self, msg, *args, **kwargs):
        await self.log("exception", msg, *args, **kwargs)

    async def read(self):
        async with _lock:
            if self.filepath is None:
                raise RuntimeError("File logging is disabled.")
            with open(self.filepath, "r") as f:
                return json.load(f)


_lock = asyncio.Lock()


def _get_logger_filepath(name: str) -> Path:
    filepath = conf.settings.LOGS_PATH / f"{name}.json"
    if not filepath.exists():
        filepath.parent.mkdir(parents=True, exist_ok=True)
    return filepath


def get_async_logger(
    name, backupcount=None, interval="D", encoding="utf-8"
) -> AsyncJSONFileLogger:
    backupcount = backupcount or 5
    filepath = None
    if conf.settings.SHOULD_LOG_API_TO_FILE:
        filepath = _get_logger_filepath(name)
    return AsyncJSONFileLogger(name, filepath, backupcount, interval, encoding)


def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(conf.settings.LOGGING_LEVEL)
    if not conf.settings.SHOULD_LOG_API_TO_FILE:
        return logger
    handler = TimedRotatingFileHandler(
        _get_logger_filepath(name),
        backupCount=5,
        when="D",
        encoding="utf-8",
    )
    handler.setFormatter(StructuredJSONFormatter())
    logger.addHandler(handler)
    return logger


console_log = logging.getLogger("uvicorn")
