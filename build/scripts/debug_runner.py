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

sys.path.insert(0, os.getcwd())


def main():
    """
    Dynamically imports a settings object and uses it to start a uvicorn server.
    This allows the debugger to launch a service using the configuration
    defined in its own settings file.

    It also conditionally disables the reloader when a debugger is attached,
    as the default 'watchfiles' reloader is incompatible with 'debugpy'.
    """
    if len(sys.argv) < 2:
        print("Usage: python debug_runner.py <path_to_settings_object>")
        sys.exit(1)

    # The 'debugpy' module is only present when a debug session is active.
    is_debugging = "debugpy" in sys.modules

    path_to_settings = sys.argv[1]
    module_path, setting_variable_name = path_to_settings.split(":")

    try:
        settings_module = importlib.import_module(module_path)
        settings = getattr(settings_module, setting_variable_name)

        # Conditionally disable the reloader if the debugger is attached.
        # This is REQUIRED for breakpoints to work with modern Uvicorn.
        reload_enabled = settings.RELOAD and not is_debugging

        # print("-" * 50)
        # if is_debugging:
        #     print("--- Debugger detected. ---")
        #     print("--- RELOADER IS DISABLED to enable breakpoints. ---")
        # else:
        #     print("--- No debugger. Reloader is ENABLED. ---")
        # print("-" * 50)

        uvicorn.run(
            "app.main:app",
            host=settings.APP_HOST,
            port=settings.APP_PORT,
            reload=reload_enabled,
            ssl_keyfile=settings.SSL_KEYFILE,
            ssl_certfile=settings.SSL_CERTFILE,
            log_level="info",
        )
    except (ImportError, AttributeError) as e:
        print(f"Error loading settings: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
