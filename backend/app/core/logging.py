"""
Centralized logging configuration using Loguru.

Import `logger` from this module anywhere in the app for consistent,
structured logging (console + rotating file).
"""

import sys
from pathlib import Path

from loguru import logger

from app.core.config import settings

LOG_DIR = Path("./logs")
LOG_DIR.mkdir(parents=True, exist_ok=True)


def configure_logging() -> None:
    logger.remove()  # remove default handler

    # Console sink — human readable
    logger.add(
        sys.stdout,
        level="DEBUG" if settings.DEBUG else "INFO",
        colorize=True,
        format=(
            "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
            "<level>{level: <8}</level> | "
            "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
            "<level>{message}</level>"
        ),
    )

    # File sink — rotated daily, retained for 14 days, JSON for log aggregators
    logger.add(
        LOG_DIR / "app_{time:YYYY-MM-DD}.log",
        level="INFO",
        rotation="00:00",
        retention="14 days",
        compression="zip",
        serialize=True,
        backtrace=True,
        diagnose=False,
    )


configure_logging()

__all__ = ["logger"]
