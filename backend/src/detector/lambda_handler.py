"""Lambda handler for room detection."""
import json
import boto3
import cv2
import numpy as np
from opencv_detector import OpenCVDetector
from typing import Dict, Any

s3_client = boto3.client('s3')


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for room detection.

    Expected event format:
    {
        "bucket": "blueprint-bucket",
        "key": "blueprints/job_123.png",
        "jobId": "job_123",
        "params": {
            "min_area": 1000,
            "max_area": 1000000
        }
    }
    """
    try:
        # Extract parameters
        bucket = event['bucket']
        key = event['key']
        job_id = event['jobId']
        params = event.get('params', {})

        print(f"Processing job {job_id} from s3://{bucket}/{key}")

        # Download image from S3
        response = s3_client.get_object(Bucket=bucket, Key=key)
        image_bytes = response['Body'].read()

        # Decode image
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise ValueError("Failed to decode image")

        print(f"Image loaded: {image.shape}")

        # Detect rooms
        detector = OpenCVDetector(
            min_area=params.get('min_area', 1000),
            max_area=params.get('max_area', 1000000)
        )
        rooms = detector.detect_rooms(image)

        print(f"Detected {len(rooms)} rooms")

        # Prepare result
        result = {
            "jobId": job_id,
            "status": "completed",
            "roomCount": len(rooms),
            "rooms": rooms,
            "metadata": {
                "imageSize": list(image.shape),
                "parameters": params
            }
        }

        # Save result to S3
        results_bucket = event.get('resultsBucket', bucket)
        results_key = f"results/{job_id}.json"

        s3_client.put_object(
            Bucket=results_bucket,
            Key=results_key,
            Body=json.dumps(result),
            ContentType='application/json'
        )

        print(f"Results saved to s3://{results_bucket}/{results_key}")

        return {
            "statusCode": 200,
            "body": json.dumps(result)
        }

    except Exception as e:
        print(f"Error processing image: {str(e)}")

        error_result = {
            "jobId": event.get('jobId', 'unknown'),
            "status": "failed",
            "error": str(e)
        }

        return {
            "statusCode": 500,
            "body": json.dumps(error_result)
        }
