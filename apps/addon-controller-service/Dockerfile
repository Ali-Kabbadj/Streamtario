FROM python:3.12-slim
ARG APP_NAME=ADDON_CONTROLLER_SERVICE
ARG APP_PORT=8001
ENV APP_NAME=${APP_NAME}
ENV APP_PORT=${APP_PORT}
ENV PYTHONPATH=/app
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt ./requirements.txt
COPY packages/python ./packages/python
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir ./packages/python
COPY apps/addon-controller-service/app ./app
EXPOSE 8001
CMD ["/usr/local/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]