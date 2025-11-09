"""
Flask server for SageMaker inference.

Implements required endpoints:
- GET /ping - Health check
- POST /invocations - Inference requests
"""

import os
import json
import traceback
from flask import Flask, request, Response
import cv2
import numpy as np
import boto3

from detector.opencv_detector import OpenCVDetector

# Initialize Flask app
app = Flask(__name__)

# Global detector instance
detector = None


def initialize_detector():
    """Initialize the detector on first request."""
    global detector
    if detector is None:
        # Read configuration if exists
        config = {}
        config_path = '/opt/ml/model/config.json'
        if os.path.exists(config_path):
            with open(config_path) as f:
                config = json.load(f)

        # Initialize detector with config
        detector = OpenCVDetector(
            min_area=config.get('min_area', 1000),
            max_area=config.get('max_area', 1000000),
            epsilon_factor=config.get('epsilon_factor', 0.01)
        )
    return detector


@app.route('/ping', methods=['GET'])
def ping():
    """
    Health check endpoint required by SageMaker.
    Returns 200 if the service is healthy.
    """
    try:
        # Initialize detector to ensure it can load
        initialize_detector()
        return Response(response='{"status": "healthy"}', status=200, mimetype='application/json')
    except Exception as e:
        return Response(
            response=json.dumps({'error': str(e)}),
            status=500,
            mimetype='application/json'
        )


@app.route('/invocations', methods=['POST'])
def invocations():
    """
    Inference endpoint required by SageMaker.
    Processes inference requests.
    """
    try:
        # Initialize detector
        det = initialize_detector()

        # Get content type
        content_type = request.content_type or 'application/json'

        # Process input based on content type
        if content_type == 'application/json':
            # JSON format with S3 path
            input_data = request.get_json()

            s3_client = boto3.client('s3')
            bucket = input_data['bucket']
            key = input_data['key']

            # Download image from S3
            response = s3_client.get_object(Bucket=bucket, Key=key)
            image_bytes = response['Body'].read()

            # Decode image
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            metadata = input_data.get('metadata', {})

        elif content_type in ['image/png', 'image/jpeg', 'image/jpg']:
            # Direct image bytes
            image_bytes = request.get_data()
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            metadata = {}

        else:
            return Response(
                response=json.dumps({'error': f'Unsupported content type: {content_type}'}),
                status=400,
                mimetype='application/json'
            )

        # Validate image
        if image is None:
            return Response(
                response=json.dumps({'error': 'Failed to decode image'}),
                status=400,
                mimetype='application/json'
            )

        # Run detection
        rooms = det.detect_rooms(image)

        # Prepare result
        result = {
            'status': 'success',
            'room_count': len(rooms),
            'rooms': rooms,
            'image_shape': list(image.shape),
            'metadata': metadata
        }

        return Response(
            response=json.dumps(result),
            status=200,
            mimetype='application/json'
        )

    except Exception as e:
        # Log error for CloudWatch
        print(f"Error during inference: {str(e)}")
        print(traceback.format_exc())

        return Response(
            response=json.dumps({
                'error': str(e),
                'traceback': traceback.format_exc()
            }),
            status=500,
            mimetype='application/json'
        )


if __name__ == '__main__':
    # Run Flask server on port 8080 (SageMaker default)
    app.run(host='0.0.0.0', port=8080)
