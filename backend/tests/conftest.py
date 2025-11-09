"""
Pytest configuration and shared fixtures

This module provides fixtures and configuration for all tests.
"""

import os
import sys
from pathlib import Path
from typing import Generator
import pytest
import boto3
from moto import mock_s3, mock_dynamodb
import numpy as np
from PIL import Image
import io

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))


@pytest.fixture
def sample_image() -> np.ndarray:
    """Create a sample blueprint image for testing."""
    # Create a simple blueprint with rooms
    img = np.ones((800, 1000, 3), dtype=np.uint8) * 255  # White background

    # Draw some room boundaries (black lines)
    # Outer boundary
    img[100:700, 100:105] = 0  # Left wall
    img[100:700, 895:900] = 0  # Right wall
    img[100:105, 100:900] = 0  # Top wall
    img[695:700, 100:900] = 0  # Bottom wall

    # Interior walls
    img[100:700, 495:500] = 0  # Vertical divider
    img[395:400, 100:500] = 0  # Horizontal divider left
    img[395:400, 500:900] = 0  # Horizontal divider right

    return img


@pytest.fixture
def sample_image_bytes(sample_image: np.ndarray) -> bytes:
    """Convert sample image to bytes."""
    img_pil = Image.fromarray(sample_image)
    buf = io.BytesIO()
    img_pil.save(buf, format='PNG')
    return buf.getvalue()


@pytest.fixture
def sample_image_file(tmp_path: Path, sample_image: np.ndarray) -> Path:
    """Save sample image to temporary file."""
    file_path = tmp_path / "test_blueprint.png"
    img_pil = Image.fromarray(sample_image)
    img_pil.save(file_path)
    return file_path


@pytest.fixture
def mock_aws_credentials():
    """Mock AWS credentials for testing."""
    os.environ["AWS_ACCESS_KEY_ID"] = "testing"
    os.environ["AWS_SECRET_ACCESS_KEY"] = "testing"
    os.environ["AWS_SECURITY_TOKEN"] = "testing"
    os.environ["AWS_SESSION_TOKEN"] = "testing"
    os.environ["AWS_DEFAULT_REGION"] = "us-east-1"


@pytest.fixture
def s3_client(mock_aws_credentials):
    """Create a mocked S3 client."""
    with mock_s3():
        s3 = boto3.client("s3", region_name="us-east-1")
        # Create test buckets
        s3.create_bucket(Bucket="test-blueprints")
        s3.create_bucket(Bucket="test-results")
        yield s3


@pytest.fixture
def dynamodb_client(mock_aws_credentials):
    """Create a mocked DynamoDB client."""
    with mock_dynamodb():
        dynamodb = boto3.client("dynamodb", region_name="us-east-1")

        # Create test table
        dynamodb.create_table(
            TableName="location-detection-jobs",
            KeySchema=[{"AttributeName": "jobId", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "jobId", "AttributeType": "S"}],
            BillingMode="PAY_PER_REQUEST",
        )

        yield dynamodb


@pytest.fixture
def mock_detection_params() -> dict:
    """Default detection parameters."""
    return {
        "min_area": 1000,
        "max_area": 1000000,
        "threshold": 0.5,
        "min_wall_length": 50,
    }


@pytest.fixture
def mock_room_result() -> dict:
    """Mock room detection result."""
    return {
        "id": "room_001",
        "name_hint": "Office",
        "area": 50000.0,
        "perimeter": 800.0,
        "polygon": [[100, 100], [400, 100], [400, 300], [100, 300]],
        "lines": [
            {"start": [100, 100], "end": [400, 100]},
            {"start": [400, 100], "end": [400, 300]},
            {"start": [400, 300], "end": [100, 300]},
            {"start": [100, 300], "end": [100, 100]},
        ],
        "center": [250, 200],
        "confidence": 0.95,
    }


@pytest.fixture
def mock_detection_result(mock_room_result: dict) -> dict:
    """Mock complete detection result."""
    return {
        "jobId": "test-job-123",
        "status": "completed",
        "roomCount": 1,
        "totalArea": 50000.0,
        "rooms": [mock_room_result],
        "metadata": {
            "imageWidth": 1000,
            "imageHeight": 800,
            "detectionModel": "v1.0.0",
        },
        "createdAt": "2025-11-07T17:00:00Z",
        "completedAt": "2025-11-07T17:02:15Z",
        "processingTime": 135,
    }


@pytest.fixture
def lambda_context():
    """Mock Lambda context object."""

    class MockLambdaContext:
        def __init__(self):
            self.function_name = "location-detection-handler"
            self.function_version = "$LATEST"
            self.invoked_function_arn = (
                "arn:aws:lambda:us-east-1:123456789012:function:location-detection-handler"
            )
            self.memory_limit_in_mb = 2048
            self.aws_request_id = "test-request-id-123"
            self.log_group_name = "/aws/lambda/location-detection-handler"
            self.log_stream_name = "2025/11/07/[$LATEST]test-stream"
            self.identity = None
            self.client_context = None

        @staticmethod
        def get_remaining_time_in_millis():
            return 300000  # 5 minutes

    return MockLambdaContext()


# Performance testing fixtures
@pytest.fixture
def large_image() -> np.ndarray:
    """Create a large test image."""
    return np.random.randint(0, 256, (2000, 3000, 3), dtype=np.uint8)


@pytest.fixture
def multiple_rooms_image() -> np.ndarray:
    """Create an image with multiple rooms."""
    img = np.ones((1500, 2000, 3), dtype=np.uint8) * 255

    # Create a grid of rooms
    for i in range(0, 1500, 300):
        img[i : i + 5, :] = 0  # Horizontal lines
    for j in range(0, 2000, 400):
        img[:, j : j + 5] = 0  # Vertical lines

    return img


# Helper functions
def assert_room_valid(room: dict) -> None:
    """Assert that a room dict has all required fields."""
    assert "id" in room
    assert "polygon" in room
    assert "lines" in room
    assert "area" in room
    assert "perimeter" in room
    assert len(room["polygon"]) >= 3
    assert len(room["lines"]) >= 3
    assert room["area"] > 0
    assert room["perimeter"] > 0


def assert_detection_result_valid(result: dict) -> None:
    """Assert that a detection result has all required fields."""
    assert "jobId" in result
    assert "status" in result
    assert result["status"] in ["pending", "processing", "completed", "failed"]

    if result["status"] == "completed":
        assert "roomCount" in result
        assert "rooms" in result
        assert len(result["rooms"]) == result["roomCount"]
        for room in result["rooms"]:
            assert_room_valid(room)


@pytest.fixture
def assert_valid_room():
    """Fixture to provide room validation function."""
    return assert_room_valid


@pytest.fixture
def assert_valid_result():
    """Fixture to provide result validation function."""
    return assert_detection_result_valid
