import datetime
import time
from LogCombiner import LogCombiner
from log_schemas.pageView import pageViewSchema

local_parquet_file_path = "./parquets"

def run():
    last_midnight = datetime.datetime.combine(datetime.datetime.today(), datetime.time.min)
    one_day = datetime.timedelta(days=1)
    schemas = {
        'PageView': pageViewSchema
    }

    logCombiner = LogCombiner('/application/development-data-val-fe', schemas, last_midnight - one_day, last_midnight)
    logCombiner.combineLogs(local_parquet_file_path)


run()