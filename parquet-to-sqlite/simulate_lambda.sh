#!/bin/bash
# Simulate AWS Lambda for Parquet to SQLite conversion using Docker
# This script builds the Lambda Docker image, downloads RIE, and runs a local test event

set -e

# Configurable paths
DOCKER_IMAGE=${DOCKER_IMAGE:-parquet-to-sqlite-lambda}
DOCKERFILE_DIR=${DOCKERFILE_DIR:-$(pwd)}
#HANDLER_FILE=${HANDLER_FILE:-src/sqlite_main.py}
HANDLER_FILE=${HANDLER_FILE:-./src/sqlite_main.py}
RIE_BINARY=aws-lambda-rie
INPUT_PARQUET=${INPUT_PARQUET:-$(pwd)/data/input_parquet/entity_data}
OUTPUT_SQLITE_DIR=${OUTPUT_SQLITE_DIR:-$(pwd)/data/output_sqlite}
OUTPUT_SQLITE_FILE=${OUTPUT_SQLITE_FILE:-output.sqlite}

# Build Docker image with Lambda base
cat > $DOCKERFILE_DIR/Dockerfile <<EOF
FROM public.ecr.aws/lambda/python:3.10
COPY $HANDLER_FILE ./sqlite_main.py
RUN pip install --no-cache-dir pandas pyarrow
CMD ["sqlite_main.lambda_handler"]
EOF

echo "Building Lambda Docker image..."
docker build -t $DOCKER_IMAGE $DOCKERFILE_DIR

# Download AWS Lambda RIE if not present
if [ ! -f "$RIE_BINARY" ]; then
  echo "Downloading AWS Lambda Runtime Interface Emulator (RIE)..."
  curl -Lo $RIE_BINARY https://github.com/aws/aws-lambda-runtime-interface-emulator/releases/latest/download/aws-lambda-rie
  chmod +x $RIE_BINARY
fi

# Create output directory if needed
mkdir -p "$OUTPUT_SQLITE_DIR"

# Run Lambda container with RIE
echo "Starting Lambda container with RIE..."
docker run -d --name lambda-sim \
  -v "$PWD/$RIE_BINARY:/aws-lambda-rie" \
  -v "$INPUT_PARQUET:/app/input.parquet" \
  -v "$OUTPUT_SQLITE_DIR:/app/output_dir" \
  -p 9000:8080 \
  $DOCKER_IMAGE \
  /aws-lambda-rie python3 -m awslambdaric sqlite_main.lambda_handler

sleep 2

echo "Invoking Lambda function with test event..."
cat > event.json <<EOF
{
  "source_bucket": "local-bucket",
  "source_key": "/app/input.parquet",
  "target_bucket": "local-bucket",
  "target_key": "/app/output_dir/$OUTPUT_SQLITE_FILE"
}
EOF

curl -s -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" -d @event.json

echo "Conversion complete. Output file: $OUTPUT_SQLITE_DIR/$OUTPUT_SQLITE_FILE"

docker stop lambda-sim && docker rm lambda-sim
rm event.json
