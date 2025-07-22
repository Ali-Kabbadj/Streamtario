from fastapi import FastAPI
from .containers import Container


class Application(FastAPI):
    """A custom FastAPI application class that includes the DI container."""

    container: Container


app = Application()
