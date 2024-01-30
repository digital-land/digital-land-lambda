# import duckdb
import boto3

logBucket = 'development-data-val-be-cdn-logs'
reportBucket = 'development-reporting'
filename = 'combined.log'
log_group_name = '/aws/cloudfront/development-data-val-fe-cdn-logs'

def lambda_handler(event, context):
    # combineLogs()
    return 'Testing' + sys.version + '!'

# this function should read the logs from cloudfront, and combine them into a single file
def combineLogs():
    session = boto3.Session(
        region_name='eu-west-2'
    )

    client = session.client('logs')

    response = client.filter_log_events(
        logGroupName='/aws/cloudfront/development-data-val-fe-cdn-logs'
    )

    print('printing the last 10 messages')
    for event in response['events'][:10]:
        print(event['message'])


# def saveLogsToParquet():
#     con = duckdb.connect()
#     con.install_extension('https')
#     con.load_extension('https')
#     con.execute("SET s3_region='eu-west-2';")
#     con.execute("SET s3_access_key_id='AKIA55A7WSGA7H2V4GHR';")
#     con.execute("SET s3_secret_access_key='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';")
#     con.execute(f"COPY (SELECT * FROM read_json('s3://bucketName/*.json') to 's3://bucketName/parquet/' (format 'parquet');")


# this function should copy the combined.log file from the CDN logs bucket to the reporting bucket
# def copyFileTest():
#     s3 = boto3.resource('s3')
#     s3.meta.client.copy_object(Bucket=reportBucket, Key='copied-' + filename, CopySource={'Bucket': logBucket, 'Key': filename})