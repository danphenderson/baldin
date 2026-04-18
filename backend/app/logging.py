# Path: app/logging.py

import asyncio
import json
import logging
import sys
from collections.abc import Mapping
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

    @staticmethod
    def _coerce_json_safe(value):
        if value is None or isinstance(value, (str, int, float, bool)):
            return value
        if isinstance(value, Mapping):
            return {
                str(key): StructuredJSONFormatter._coerce_json_safe(item)
                for key, item in value.items()
            }
        if isinstance(value, (list, tuple, set, frozenset)):
            return [StructuredJSONFormatter._coerce_json_safe(item) for item in value]
        if isinstance(value, datetime):
            return value.isoformat()
        return str(value)

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
        structured_data = getattr(record, "structured_data", None)
        if isinstance(structured_data, Mapping):
            for key, value in structured_data.items():
                safe_value = self._coerce_json_safe(value)
                if key in log_entry:
                    log_entry[f"structured_{key}"] = safe_value
                else:
                    log_entry[key] = safe_value
        elif structured_data is not None:
            log_entry["structured_data"] = self._coerce_json_safe(structured_data)
        if record.exc_info and record.exc_info[1] is not None:
            log_entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_entry)


class AsyncJSONFileLogger:
    def __init__(self, name, filepath, backupcount=5, interval="D", encoding="utf-8"):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(conf.settings.LOGGING_LEVEL)
        if not conf.settings.SHOULD_LOG_API_TO_FILE or filepath is None:
            self.filepath = None
            return
        self.filepath = filepath
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
                raise RuntimeError("Cannot read logs: file logging is disabled.")
            with open(self.filepath, "r") as f:
                return [json.loads(line) for line in f if line.strip()]


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
