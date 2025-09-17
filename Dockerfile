FROM public.ecr.aws/lambda/python:3.10
COPY ./src/sqlite_main.py ./sqlite_main.py
RUN pip install --no-cache-dir pandas pyarrow
CMD ["sqlite_main.lambda_handler"]
