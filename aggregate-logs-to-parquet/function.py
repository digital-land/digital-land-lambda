import duckdb

bucketName = 'lpa-data-validation-logs'

def lambda_handler(event, context):
    saveLogsToParquet()

def saveLogsToParquet():
    con = duckdb.connect()
    con.install_extension('https')
    con.load_extension('https')
    con.execute("SET s3_region='eu-west-2';")
    con.execute("SET s3_access_key_id='AKIA55A7WSGA7H2V4GHR';")
    con.execute("SET s3_secret_access_key='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';")
    con.execute(f"COPY (SELECT * FROM read_json('s3://bucketName/*.json') to 's3://bucketName/parquet/' (format 'parquet');")