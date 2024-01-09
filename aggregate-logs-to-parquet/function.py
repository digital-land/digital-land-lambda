import duckdb

bucketName = 'lpa-data-validation-logs'

def lambda_handler(event, context):
    saveLogsToParquet()

def saveLogsToParquet():
    con = duckdb.connect()
    con.install_extension('https')
    con.load_extension('https')
    con.execute("SET s3_region='eu-west-2';")
    con.execute("SET s3_access_key_id='';")
    con.execute("SET s3_secret_access_key='';")
    con.execute(f"COPY (SELECT * FROM read_json('s3://bucketName/*.json') to 's3://bucketName/parquet/' (format 'parquet');")