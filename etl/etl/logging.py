import sys
import logging

from .conf import settings

logging.basicConfig(
    stream=sys.stdout,  # uncomment this line to redirect output to console
    format="%(levelname)s: %(message)s",
    level=settings.LOGGING_LEVEL,
)

def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
