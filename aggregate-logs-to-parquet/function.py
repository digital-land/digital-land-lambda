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

    logCombiner = LogCombiner('/application/production-data-val-fe', schemas, last_midnight - one_day, last_midnight)
    logCombiner.combineLogs(parquet_file_path)

def run_custom(start, end, schemas):
    logCombiner = LogCombiner('/application/production-data-val-fe', schemas, start, end)
    logCombiner.combineLogs(parquet_file_path)



from datetime import datetime, time, timedelta

# Get the current time
now = datetime.now()

# Define the cut-off time
cut_off = datetime(2024, 2, 26, 15, 0)  # 3 PM

# Check if the current time is earlier than the cut-off time
if now < cut_off:
    last_midnight = datetime.combine(datetime.today(), time.min)
    one_day = timedelta(days=1)
    for i in range(30):
        start = last_midnight - one_day * i
        end = start + one_day
        run_custom(start, end, schemas)
        print(f"Finished day {i+1} of 30")