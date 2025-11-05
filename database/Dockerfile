FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt ./requirements.txt
COPY packages/python ./packages/python
COPY database .
RUN pip install -r requirements.txt alembic
RUN pip install --no-cache-dir /app/packages/python
