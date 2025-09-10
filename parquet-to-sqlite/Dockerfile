FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Copy source code
COPY src/sqlite_main.py ./sqlite_main.py

# Install dependencies
RUN pip install --no-cache-dir boto3 pandas pyarrow

# Entrypoint for local testing
ENTRYPOINT []
