"""
SageMaker inference script for location detection.

This script implements the SageMaker inference interface:
- model_fn: Load the model
- input_fn: Deserialize input data
- predict_fn: Run inference
- output_fn: Serialize output
"""

import json
import os
import cv2
import numpy as np
import boto3
from pathlib import Path
from typing import Dict, Any, List

# Import detector from local module
from detector.opencv_detector import OpenCVDetector


def model_fn(model_dir: str) -> OpenCVDetector:
    """
    Load the model. SageMaker calls this once when container starts.

    Args:
        model_dir: Path to model artifacts

    Returns:
        Detector instance
    """
    # Read configuration if exists
    config_path = Path(model_dir) / 'config.json'
    if config_path.exists():
        with open(config_path) as f:
            config = json.load(f)
    else:
        config = {}

    # Initialize detector with config
    detector = OpenCVDetector(
        min_area=config.get('min_area', 1000),
        max_area=config.get('max_area', 1000000),
        epsilon_factor=config.get('epsilon_factor', 0.01)
    )

    return detector


def input_fn(request_body: bytes, content_type: str) -> Dict[str, Any]:
    """
    Deserialize input data.

    Args:
        request_body: Request body bytes
        content_type: Content type string

    Returns:
        Processed input for prediction containing image and metadata
    """
    if content_type == 'application/json':
        # JSON format with S3 path
        input_data = json.loads(request_body)

        s3_client = boto3.client('s3')
        bucket = input_data['bucket']
        key = input_data['key']

        # Download image from S3
        response = s3_client.get_object(Bucket=bucket, Key=key)
        image_bytes = response['Body'].read()

        # Decode image
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        return {
            'image': image,
            'metadata': input_data.get('metadata', {})
        }

    elif content_type in ['image/png', 'image/jpeg']:
        # Direct image bytes
        nparr = np.frombuffer(request_body, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        return {
            'image': image,
            'metadata': {}
        }

    else:
        raise ValueError(f"Unsupported content type: {content_type}")


def predict_fn(input_data: Dict[str, Any], model: OpenCVDetector) -> Dict[str, Any]:
    """
    Run inference.

    Args:
        input_data: Preprocessed input from input_fn
        model: Model from model_fn

    Returns:
        Prediction results
    """
    image = input_data['image']
    metadata = input_data['metadata']

    if image is None:
        raise ValueError("Failed to decode image")

    # Run detection
    rooms = model.detect_rooms(image)

    # Prepare result
    result = {
        'status': 'success',
        'room_count': len(rooms),
        'rooms': rooms,
        'image_shape': list(image.shape),
        'metadata': metadata
    }

    return result


def output_fn(prediction: Dict[str, Any], accept_type: str) -> tuple:
    """
    Serialize prediction output.

    Args:
        prediction: Prediction from predict_fn
        accept_type: Requested output format

    Returns:
        Tuple of (serialized output, content type)
    """
    if accept_type == 'application/json':
        return json.dumps(prediction), accept_type
    else:
        raise ValueError(f"Unsupported accept type: {accept_type}")
