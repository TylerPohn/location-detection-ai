FROM public.ecr.aws/lambda/python:3.9

# Install Python dependencies
COPY requirements.txt ${LAMBDA_TASK_ROOT}/
RUN pip install --no-cache-dir -r ${LAMBDA_TASK_ROOT}/requirements.txt

# Copy detector module and handler
COPY detector/ ${LAMBDA_TASK_ROOT}/detector/
COPY lambda_handler.py ${LAMBDA_TASK_ROOT}/lambda_handler.py

# Note: Handler is configured in Lambda function configuration, not in Dockerfile
# AWS Lambda base images have a special ENTRYPOINT that requires handler as argument
