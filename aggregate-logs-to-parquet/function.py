import duckdb
import boto3
import datetime
import time

# logBucket = 'development-data-val-be-cdn-logs'
# filename = 'combined.log'
reportBucket = 'development-reporting'

log_group_names = [
    'development-data-val-fe-cdn-logs',
    'development-data-val-be-cdn-logs'
]

def lambda_handler(event, context):
    for log_group_name in log_group_names:
        combineLogs(log_group_name)

def combineLogs(log_group_name):
    session = boto3.Session(
        region_name='eu-west-2'
    )

    client = session.client('logs')

    # Get the current time
    last_midnight = datetime.datetime.combine(datetime.date.today(), datetime.time()).timestamp() * 1000

    # Subtract 24 hours from the current time
    one_day = datetime.timedelta(days=1).timestamp() * 1000

    # get the logs from cloudfront
    response = client.filter_log_events(
        logGroupName=f'/aws/cloudfront/{log_group_name}',
        startTime=last_midnight - one_day,
        endTime=last_midnight
    )

    # create a duckdb connection
    con = duckdb.connect()

    # get the json keys of the first message
    # this will be used to create the table
    json_keys = list(response['events'][0]['message'].keys())

    # create the table
    con.execute(f"CREATE TABLE logs ({', '.join(json_keys)});")

    # insert the data into the table
    for event in response['events']:
        values = ', '.join([f'\'{value}\'' for value in event['message'].values()])
        con.execute(f"INSERT INTO logs VALUES ({values});")

    # save the table to parquet
    con.execute(f"COPY logs TO 's3://{reportBucket}/{log_group_name}/{datetime.date.today().isoformat()}' (format 'parquet');")
