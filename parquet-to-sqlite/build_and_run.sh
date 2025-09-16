#!/bin/bash
# Build and run Parquet to SQLite conversion in Docker

set -e


# Generic paths (edit or set via environment variables)
DOCKER_IMAGE=${DOCKER_IMAGE:-parquet-to-sqlite}
DOCKERFILE_DIR=${DOCKERFILE_DIR:-$(pwd)}
INPUT_PARQUET=${INPUT_PARQUET:-$(pwd)/data/input_parquet/entity_data}
OUTPUT_SQLITE_DIR=${OUTPUT_SQLITE_DIR:-$(pwd)/data/output_sqlite}
OUTPUT_SQLITE_FILE=${OUTPUT_SQLITE_FILE:-output.sqlite}

# Build Docker image
echo "Building Docker image..."
docker build -t $DOCKER_IMAGE $DOCKERFILE_DIR

echo "Creating output directory if not exists..."
mkdir -p "$OUTPUT_SQLITE_DIR"

# Run conversion
echo "Running Parquet to SQLite conversion in Docker..."
docker run --rm \
  -v "$INPUT_PARQUET:/app/input.parquet" \
  -v "$OUTPUT_SQLITE_DIR:/app/output_dir" \
  $DOCKER_IMAGE \
  python sqlite_main.py local --parquet-path /app/input.parquet --sqlite-path /app/output_dir/$OUTPUT_SQLITE_FILE

echo "Conversion complete. Output file: $OUTPUT_SQLITE_DIR/$OUTPUT_SQLITE_FILE"
