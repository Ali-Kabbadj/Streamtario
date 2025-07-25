import logging
import logging.handlers
import sys
import os
import json
from datetime import datetime


class CustomJsonFormatter(logging.Formatter):
    def __init__(self, app_name: str, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.app_name = app_name

    def format(self, record: logging.LogRecord) -> str:
        timestamp = (
            datetime.fromtimestamp(record.created).strftime("%M:%S")
            + f".{int(record.msecs):03d}"
        )
        emoji_map = {
            "INFO": "✅",
            "WARNING": "⚠️",
            "ERROR": "❌",
            "CRITICAL": "🔥",
            "DEBUG": "🐞",
            "INIT": "🚀",
            "CACHE": "💾",
            "DB": "🗄️",
            "BG_TASK": "🏃",
            "HTTP": "🌐",
        }
        level_name = record.levelname
        emoji = emoji_map.get(level_name, "💬")
        context = getattr(record, "context", "general")
        log_obj = {
            "timestamp": timestamp,
            "emoji": emoji,
            "app": self.app_name,
            "level": level_name,
            "file": os.path.basename(record.pathname),
            "context": context,
            "function": record.funcName,
            "message": record.getMessage(),
        }
        if data := getattr(record, "data", None):
            try:
                json.dumps(data)
                log_obj["data"] = data
            except TypeError:
                log_obj["data"] = f"Unserializable data: {str(data)}"
        return json.dumps(log_obj)


class VscodeDebugConsoleHandler(logging.Handler):
    """
    A handler that prints the log metadata as a formatted string, and then
    prints the raw 'data' object on a new line to leverage the VS Code
    Debugger's interactive object rendering.
    """

    def __init__(self, app_name: str):
        super().__init__()
        self.app_name = app_name
        self.emoji_map = {
            "INFO": "✅",
            "WARNING": "⚠️",
            "ERROR": "❌",
            "CRITICAL": "🔥",
            "DEBUG": "🐞",
            "INIT": "🚀",
            "CACHE": "💾",
            "DB": "🗄️",
            "BG_TASK": "🏃",
            "HTTP": "🌐",
        }

    def emit(self, record: logging.LogRecord) -> None:
        try:
            timestamp = (
                datetime.fromtimestamp(record.created).strftime("%M:%S")
                + f".{int(record.msecs):03d}"
            )
            emoji = self.emoji_map.get(record.levelname, "💬")
            context = getattr(record, "context", "general")
            file_name = os.path.basename(record.pathname)
            func_name = record.funcName
            message = record.getMessage()

            log_string = (
                f"[{timestamp}][{emoji}][{self.app_name}][{file_name}]"
                f"[{context}][{func_name}] {message}"
            )

            print(log_string, file=sys.stdout)

            if hasattr(record, "data") and record.data:
                print_my_json(record.data)

        except Exception:
            self.handleError(record)

            import json


def print_my_json(obj, *, indent: int = 2, sort_keys: bool = False):
    """
    Pretty‑print any JSON‑serializable Python object to stdout.

    Args:
      obj:        The object (e.g. dict, list) to serialize.
      indent:     Number of spaces to indent nested structures.
      sort_keys:  Whether to sort dictionary keys.
    """
    print(json.dumps(obj, indent=indent, sort_keys=sort_keys))


def setup_logging(app_name: str = "StreamtarioApp"):
    is_prod = os.getenv("APP_ENV") == "production"
    # log_level = "INFO" if is_prod else "DEBUG"
    log_level = "INFO"
    logger = logging.getLogger()
    logger.setLevel(log_level)
    if logger.hasHandlers():
        logger.handlers.clear()

    if is_prod:
        # Production gets the robust JSON file logger
        file_handler = logging.handlers.RotatingFileHandler(
            f"logs/{app_name}.log", maxBytes=5 * 1024 * 1024, backupCount=3
        )
        file_handler.setFormatter(CustomJsonFormatter(app_name=app_name))
        logger.addHandler(file_handler)
    else:
        # Development gets our new, final, beautiful handler
        vscode_handler = VscodeDebugConsoleHandler(app_name=app_name)
        logger.addHandler(vscode_handler)


def _log_with_extra(level, msg, *args, **kwargs):
    extra = {
        "context": kwargs.pop("context", "general"),
        "data": kwargs.pop("data", None),
    }
    logging.log(level, msg, *args, extra=extra, stacklevel=3, **kwargs)


INIT_LEVEL, CACHE_LEVEL, DB_LEVEL, BG_TASK_LEVEL, HTTP_LEVEL = 21, 22, 23, 24, 25
logging.addLevelName(INIT_LEVEL, "INIT")
logging.addLevelName(CACHE_LEVEL, "CACHE")
logging.addLevelName(DB_LEVEL, "DB")
logging.addLevelName(BG_TASK_LEVEL, "BG_TASK")
logging.addLevelName(HTTP_LEVEL, "HTTP")


def log_info(msg, *args, **kwargs):
    _log_with_extra(logging.INFO, msg, *args, **kwargs)


def log_warn(msg, *args, **kwargs):
    _log_with_extra(logging.WARNING, msg, *args, **kwargs)


def log_error(msg, *args, **kwargs):
    _log_with_extra(logging.ERROR, msg, *args, **kwargs)


def log_init(msg, *args, **kwargs):
    kwargs["context"] = "init"
    _log_with_extra(INIT_LEVEL, msg, *args, **kwargs)


def log_cache(msg, *args, **kwargs):
    kwargs["context"] = "cache"
    _log_with_extra(CACHE_LEVEL, msg, *args, **kwargs)


def log_db(msg, *args, **kwargs):
    kwargs["context"] = "db"
    _log_with_extra(DB_LEVEL, msg, *args, **kwargs)


def log_bg_task(msg, *args, **kwargs):
    kwargs["context"] = "bg_task"
    _log_with_extra(BG_TASK_LEVEL, msg, *args, **kwargs)


def log_http(msg, *args, **kwargs):
    kwargs["context"] = "http"
    _log_with_extra(HTTP_LEVEL, msg, *args, **kwargs)
