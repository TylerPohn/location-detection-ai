"""
AWS Lambda handler for ML inference using YOLO room detector.
This is the new handler that uses YOLOv8 instead of OpenCV.
"""

import json
import boto3
import traceback
import os

# Lazy imports to avoid init-time failures
s3_client = boto3.client('s3')
_detector = None


def _get_detector():
    """Lazy initialization of detector to avoid module-level import failures."""
    global _detector
    if _detector is None:
        try:
            import cv2
            import numpy as np
            from detector.yolo_detector import YOLODetector

            # Get model path from environment or use default
            model_path = os.environ.get('YOLO_MODEL_PATH', '/var/task/models/best.pt')
            conf_threshold = float(os.environ.get('YOLO_CONF_THRESHOLD', '0.25'))
            iou_threshold = float(os.environ.get('YOLO_IOU_THRESHOLD', '0.45'))

            _detector = YOLODetector(
                model_path=model_path,
                conf_threshold=conf_threshold,
                iou_threshold=iou_threshold
            )
            print(f"Successfully initialized YOLODetector with model: {model_path}")
        except ImportError as e:
            print(f"ERROR: Failed to import required modules: {e}")
            traceback.print_exc()
            raise
        except Exception as e:
            print(f"ERROR: Failed to initialize detector: {e}")
            traceback.print_exc()
            raise
    return _detector


def handler(event, context):
    """
    Lambda handler for ML inference using YOLO.

    Expected event format:
    {
        "bucket": "bucket-name",
        "key": "blueprints/job-id.png",
        "jobId": "job-id",
        "timestamp": "ISO timestamp"
    }

    Returns:
    {
        "statusCode": 200,
        "body": {
            "jobId": "job-id",
            "status": "completed",
            "room_count": 8,
            "rooms": [
                {
                    "id": "room_001",
                    "bounding_box": [100, 200, 400, 600],
                    "name_hint": "Kitchen",
                    "confidence": 0.92
                }
            ],
            "image_shape": [1050, 1432, 3],
            "timestamp": "ISO timestamp",
            "model_info": {
                "type": "YOLOv8",
                "version": "v8m"
            }
        }
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

        # Get detector instance (lazy initialization)
        detector = _get_detector()

        # Import numpy and cv2 for image processing
        import numpy as np
        import cv2

        # Decode image
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise ValueError("Failed to decode image")

        # Run YOLO detection
        print(f"Running YOLO room detection for job {job_id}")
        rooms = detector.detect_rooms(image)

        # Prepare result in required format
        result = {
            'jobId': job_id,
            'status': 'completed',
            'room_count': len(rooms),
            'rooms': rooms,  # Already in correct format with id, bounding_box, name_hint
            'image_shape': list(image.shape),
            'timestamp': event.get('timestamp'),
            'model_info': {
                'type': 'YOLOv8',
                'version': 'v8m',
                'conf_threshold': detector.conf_threshold,
                'iou_threshold': detector.iou_threshold
            }
        }

        # Save result to S3
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

        print(f"YOLO detection complete for job {job_id}: {len(rooms)} rooms found")
        print(f"Room types detected: {[r['name_hint'] for r in rooms]}")
        print(f"Results saved to s3://{results_bucket}/{result_key}")

        return {
            'statusCode': 200,
            'body': json.dumps(result)
        }

    except Exception as e:
        print(f"Error during inference: {str(e)}")
        traceback.print_exc()

        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e),
                'jobId': event.get('jobId', 'unknown'),
                'status': 'failed'
            })
        }
