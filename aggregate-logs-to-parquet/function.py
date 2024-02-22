import datetime
import time
from LogCombiner import LogCombiner
from log_schemas.pageView import pageViewSchema

reportBucket = 'development-reporting'

schemas = {
    'PageView': pageViewSchema
}

parquet_file_path = f"s3://{reportBucket}"

def lambda_handler(event, context):
    run()

def run():
    last_midnight = datetime.datetime.combine(datetime.datetime.today(), datetime.time.min)
    one_day = datetime.timedelta(days=1)
    hours = datetime.timedelta(hours=1)
    schemas = {
        'PageView': pageViewSchema
    }

    logCombiner = LogCombiner('/application/development-data-val-fe', schemas, last_midnight - one_day, last_midnight)
    logCombiner.combineLogs(parquet_file_path)