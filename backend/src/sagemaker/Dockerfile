FROM public.ecr.aws/lambda/python:3.9

# Install system dependencies for OpenCV
RUN yum install -y \
    mesa-libGL \
    && yum clean all

# Install Python dependencies
COPY requirements.txt ${LAMBDA_TASK_ROOT}/
RUN pip install --no-cache-dir -r ${LAMBDA_TASK_ROOT}/requirements.txt

# Copy detector module and handler
COPY detector/ ${LAMBDA_TASK_ROOT}/detector/
COPY lambda_handler.py ${LAMBDA_TASK_ROOT}/lambda_handler.py

# Set CMD for Lambda entrypoint (required by AWS Lambda base image)
CMD ["lambda_handler.handler"]
