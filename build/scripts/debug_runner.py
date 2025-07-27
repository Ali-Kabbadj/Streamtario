import sys
import os
import uvicorn
import importlib
import warnings

warnings.filterwarnings(
    "ignore",
    message=r".*_type_definition is deprecated.*",
    category=UserWarning,
    module="strawberry.utils.deprecations",
)

warnings.filterwarnings(
    "ignore",
    message=r".*`util._extend` API is deprecated.*",
    category=UserWarning,
)

sys.path.insert(0, os.getcwd())


def main():
    """
    Dynamically imports a settings object and uses it to start a uvicorn server.
    This allows the debugger to launch a service using the configuration
    defined in its own settings file.
    """
    if len(sys.argv) < 2:
        print("Usage: python debug_runner.py <path_to_settings_object>")
        sys.exit(1)

    is_debugging = "debugpy" in sys.modules
    path_to_settings = sys.argv[1]
    module_path, setting_variable_name = path_to_settings.split(":")

    try:
        settings_module = importlib.import_module(module_path)
        settings = getattr(settings_module, setting_variable_name)

        reload_enabled = settings.RELOAD and not is_debugging
        ssl_keyfile = settings.SSL_KEYFILE if settings.SSL_KEYFILE else None
        ssl_certfile = settings.SSL_CERTFILE if settings.SSL_CERTFILE else None

        uvicorn_args = {
            "host": settings.APP_HOST,
            "port": settings.APP_PORT,
            "reload": reload_enabled,
            "log_level": "info",
        }

        if ssl_keyfile and ssl_certfile:
            print("--- SSL DETECTED: Running in HTTPS mode. ---")
            uvicorn_args["ssl_keyfile"] = ssl_keyfile
            uvicorn_args["ssl_certfile"] = ssl_certfile
        else:
            print("--- NO SSL: Running in standard HTTP mode. ---")

        uvicorn.run("app.main:app", **uvicorn_args)

    except (ImportError, AttributeError) as e:
        print(f"Error loading settings: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
