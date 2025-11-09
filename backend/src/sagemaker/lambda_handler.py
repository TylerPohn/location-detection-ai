"""
AWS Lambda handler for ML inference using OpenCV room detector.
"""

import json
import boto3
import cv2
import numpy as np
from detector.opencv_detector import OpenCVDetector

s3_client = boto3.client('s3')
detector = OpenCVDetector()


def handler(event, context):
    """
    Lambda handler for ML inference.

    Expected event format:
    {
        "bucket": "bucket-name",
        "key": "blueprints/job-id.png",
        "jobId": "job-id",
        "timestamp": "ISO timestamp"
    }
    """
    try:
        # Extract parameters from event
        bucket = event['bucket']
        key = event['key']
        job_id = event['jobId']

        print(f"Processing job {job_id}: s3://{bucket}/{key}")

        # Download image from S3
        response = s3_client.get_object(Bucket=bucket, Key=key)
        image_bytes = response['Body'].read()

        # Decode image
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise ValueError("Failed to decode image")

        # Run detection
        print(f"Running room detection for job {job_id}")
        rooms = detector.detect_rooms(image)

        # Prepare result
        result = {
            'jobId': job_id,
            'status': 'completed',
            'room_count': len(rooms),
            'rooms': rooms,
            'image_shape': list(image.shape),
            'timestamp': event.get('timestamp')
        }

        # Save result to S3
        import os
        results_bucket = os.environ.get('RESULTS_BUCKET_NAME')
        if not results_bucket:
            raise ValueError("RESULTS_BUCKET_NAME environment variable not set")
        result_key = f"results/{job_id}.json"

        s3_client.put_object(
            Bucket=results_bucket,
            Key=result_key,
            Body=json.dumps(result),
            ContentType='application/json'
        )

        print(f"Detection complete for job {job_id}: {len(rooms)} rooms found")
        print(f"Results saved to s3://{results_bucket}/{result_key}")

        return {
            'statusCode': 200,
            'body': json.dumps(result)
        }

    except Exception as e:
        print(f"Error during inference: {str(e)}")
        import traceback
        traceback.print_exc()

        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e),
                'jobId': event.get('jobId', 'unknown')
            })
        }
