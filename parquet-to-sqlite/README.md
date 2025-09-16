# Parquet to SQLite Conversion (Docker)

This project provides a workflow to convert Parquet files to SQLite using Docker for local development and testing.

## Prerequisites

- Docker installed on your system
- Parquet file(s) available locally

## Quick Start

1. **Build the Docker image:**
	```sh
	docker build -t parquet-to-sqlite .
	```

2. **Prepare your input and output directories:**
	```sh
	mkdir -p ./data/input_parquet
	mkdir -p ./data/output_sqlite
	# Place your Parquet file in ./data/input_parquet (e.g., entity_data)
	```

3. **Run the conversion:**
	```sh
	docker run --rm \
	  -v $(pwd)/data/input_parquet/entity_data:/app/input.parquet \
	  -v $(pwd)/data/output_sqlite:/app/output_dir \
	  parquet-to-sqlite \
	  python sqlite_main.py local --parquet-path /app/input.parquet --sqlite-path /app/output_dir/output.sqlite
	```

## Automated Build & Run

You can use the provided script to automate the build and run process:

```sh
bash build_and_run.sh
```

You can customize paths by setting environment variables before running:

```sh
DOCKERFILE_DIR=/path/to/project INPUT_PARQUET=/path/to/input.parquet OUTPUT_SQLITE_DIR=/path/to/output_dir OUTPUT_SQLITE_FILE=mydata.sqlite bash build_and_run.sh
```

## Customization

- Edit `build_and_run.sh` to change default paths or Docker image name.
- The script uses environment variables for flexibility.

## Troubleshooting

- Ensure all directories exist before running Docker.
- Mount directories, not files, for output.
- If you see `sqlite3.OperationalError: unable to open database file`, check output directory permissions and existence.

## Project Structure

- `sqlite_main.py`: Main conversion script
- `Dockerfile`: Docker build instructions
- `build_and_run.sh`: Automated build/run script
- `data/input_parquet/`: Place your Parquet files here
- `data/output_sqlite/`: Output SQLite files will be written here

## License

MIT
