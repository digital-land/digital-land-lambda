import duckdb
import boto3
import datetime
import time

# logBucket = 'development-data-val-be-cdn-logs'
# filename = 'combined.log'
reportBucket = 'development-reporting'

log_group_names = [
    'development-data-val-fe-cdn-logs'
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
    last_midnight = datetime.datetime.combine(datetime.datetime.today(), datetime.time.min)

    # Subtract 24 hours from the current time
    one_day = datetime.timedelta(days=30)

    print('getting logs for: ' + log_group_name + ' from: ' + str(last_midnight - one_day) + ' to: ' + str(last_midnight))

    # get the logs from cloudfront
    response = client.filter_log_events(
        logGroupName=f'/aws/cloudfront/{log_group_name}',
        startTime=int(last_midnight.timestamp() - one_day.total_seconds()),
        endTime=int(last_midnight.timestamp())
    )

    if len(response['events']) == 0:
        print('No logs found for: ' + log_group_name)
        return

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

    print(f'Successfully made parquet file: {log_group_name}/{datetime.date.today().isoformat()}')


combineLogs('development-data-val-fe-cdn-logs')