import os
import boto3
import pandas as pd
import sqlite3
import tempfile

def parquet_to_sqlite_s3(source_bucket, source_key, target_bucket, target_key):
    s3 = boto3.client('s3',
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        region_name=os.getenv('AWS_REGION', 'eu-west-2')
    )
    with tempfile.NamedTemporaryFile(suffix='.parquet') as parquet_temp:
        s3.download_fileobj(source_bucket, source_key, parquet_temp)
        parquet_temp.flush()
        df = pd.read_parquet(parquet_temp.name)
        with tempfile.NamedTemporaryFile(suffix='.sqlite') as sqlite_temp:
            conn = sqlite3.connect(sqlite_temp.name)
            df.to_sql('data', conn, index=False, if_exists='replace')
            conn.close()
            sqlite_temp.flush()
            sqlite_temp.seek(0)
            s3.upload_fileobj(sqlite_temp, target_bucket, target_key)
    return f'Successfully converted {source_key} to {target_key}'

def lambda_handler(event, context):
    source_bucket = event['source_bucket']
    source_key = event['source_key']
    target_bucket = event['target_bucket']
    target_key = event['target_key']
    result = parquet_to_sqlite_s3(source_bucket, source_key, target_bucket, target_key)
    return {
        'statusCode': 200,
        'body': result
    }

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Convert S3 Parquet to SQLite and upload to S3")
    parser.add_argument('--source-bucket', required=True)
    parser.add_argument('--source-key', required=True)
    parser.add_argument('--target-bucket', required=True)
    parser.add_argument('--target-key', required=True)
    args = parser.parse_args()
    print(parquet_to_sqlite_s3(args.source_bucket, args.source_key, args.target_bucket, args.target_key))