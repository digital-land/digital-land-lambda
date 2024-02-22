import json
import os
import duckdb
import boto3
import datetime
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
        self.duckdb_connection = duckdb.connect()
        self.created_tables = {}

    def combineLogs(self, save_file_path):
        logs = self._fetch_logs()
        self._add_logs_to_tables(logs)
        self._save_tables_to_parquet(save_file_path)

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
            field_values = [f'\'{message_json[field]}\'' for field in field_names]

            # insert the data into the table
            self.duckdb_connection.execute(f"INSERT INTO {message_type} VALUES ({', '.join(field_values)});")
        
        if len(unrecognised_message_types) > 0:
            print(f"Unrecognised message types: {unrecognised_message_types}")

    def _save_tables_to_parquet(self, save_file_path):
        # save created tables to parquet
        for table in self.created_tables:
            # Define the directory path
            dir_path = f"{save_file_path}/{self.log_group_name}/{table}"
            
            # Check if the directory exists, create it if it doesn't
            if not os.path.exists(dir_path):
                os.makedirs(dir_path)

            self.duckdb_connection.execute(f"COPY {table} TO '{dir_path}/{self.start_time.strftime('%Y-%m-%d')}.parquet' (format 'parquet');")
            self.duckdb_connection.execute(f"DROP TABLE {table};")
            print(f"Saved {table}/{self.start_time.strftime('%Y-%m-%d')} to parquet")