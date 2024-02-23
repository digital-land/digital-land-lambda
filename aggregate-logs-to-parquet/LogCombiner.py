import json
import os
import duckdb
import boto3
import time
from helpers import isJson

class LogCombiner:
    def __init__(self, log_group_name, log_schemas, start_time, end_time):
        self.log_group_name = log_group_name
        self.start_time = start_time
        self.end_time = end_time
        self.schemas = log_schemas
        self.session = boto3.Session(region_name='eu-west-2')
        self.client = self.session.client('logs')
        self.created_tables = {}

        self.duckdb_connection = duckdb.connect()
        self.duckdb_connection.execute("SET home_directory='/tmp'")
        self.duckdb_connection.install_extension('https')
        self.duckdb_connection.load_extension('https')
        self.duckdb_connection.install_extension('aws')
        self.duckdb_connection.load_extension('aws')
        self.duckdb_connection.execute("CALL load_aws_credentials();")
        self.duckdb_connection.execute("SET s3_region='eu-west-2';")


    def combineLogs(self, save_file_path):
        start_time = time.time()
        logs = self._fetch_logs()
        fetch_logs_time = time.time()
        print(f"Time taken to fetch logs: {fetch_logs_time - start_time} seconds")

        self._add_logs_to_tables(logs)
        add_logs_to_tables_time = time.time()
        print(f"Time taken to add logs to tables: {add_logs_to_tables_time - fetch_logs_time} seconds")

        self._save_tables_to_parquet(save_file_path)
        save_tables_to_parquet_time = time.time()
        print(f"Time taken to save tables to parquet: {save_tables_to_parquet_time - add_logs_to_tables_time} seconds")

    def _fetch_logs(self):
        print('getting logs for: ' + self.log_group_name + ' from: ' + str(self.start_time) + ' to: ' + str(self.end_time))

        # get the logs from cloudfront
        response = self.client.filter_log_events(
            logGroupName=self.log_group_name,
            startTime=int(self.start_time.timestamp() * 1000),
            endTime=int(self.end_time.timestamp() * 1000)
        )

        print('got ' + str(len(response['events'])) + ' logs')

        return response['events']

    def _add_logs_to_tables(self, logs):
        unrecognised_message_types = set()
        batch_data = {}

        for event in logs:
            if not isJson(event['message']):
                continue

            message_json = json.loads(event['message'])

            if 'type' not in message_json:
                print(f"Message type not found in message: {message_json}")
                continue

            message_type = message_json['type']

            if message_type not in self.schemas:
                unrecognised_message_types.add(message_json['type'])
                continue

            schema = self.schemas[message_type]

            # create the table if doesn't exist
            if message_type not in self.created_tables:
                self.created_tables[message_type] = True
                fields = ', '.join(['{} {}'.format(field["name"], field["type"]) for field in schema])
                query = "CREATE TABLE {} ({});".format(message_type, fields)
                self.duckdb_connection.execute(query)

            # get field names
            field_names = [field['name'] for field in schema]

            # get field values
            field_values = [message_json[field] for field in field_names]

            # add the data to the batch
            if message_type not in batch_data:
                batch_data[message_type] = []
            batch_data[message_type].append(field_values)

        # insert the batch data into the tables
        for message_type, data in batch_data.items():
            placeholders = ', '.join(['?' for _ in data[0]])
            self.duckdb_connection.executemany(f"INSERT INTO {message_type} VALUES ({placeholders});", data)

        if len(unrecognised_message_types) > 0:
            print(f"Unrecognised message types: {unrecognised_message_types}")

    def _save_tables_to_parquet(self, save_file_path):
        # save created tables to parquet
        for table in self.created_tables:
            # Define the directory path
            dir_path = f"{save_file_path}{self.log_group_name}/{table}"

            s3 = boto3.client('s3')
            bucket_name = 'development-reporting'
            folder_name = dir_path

            s3.put_object(Bucket=bucket_name, Key=(folder_name))

            self.duckdb_connection.execute(f"COPY {table} TO '{dir_path}/{self.start_time.strftime('%Y-%m-%d')}.parquet' (format 'parquet');")
            self.duckdb_connection.execute(f"DROP TABLE {table};")
            print(f"Saved {table}/{self.start_time.strftime('%Y-%m-%d')} to parquet")