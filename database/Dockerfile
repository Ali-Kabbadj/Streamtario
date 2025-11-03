FROM python:3.11-slim

WORKDIR /app

# Install PostgreSQL client for running psql commands.
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copies the requirements file for external packages.
COPY requirements.txt ./requirements.txt

# Copies the shared Python package source code into the image.
COPY packages/python ./packages/python

# Copies the database-specific files, including migrations.
COPY database .

# Installs external Python dependencies from PyPI.
RUN pip install -r requirements.txt alembic

# Installs the local shared package, making 'core' available.
RUN pip install --no-cache-dir /app/packages/python
