"""
Example test file demonstrating test patterns

This file shows examples of:
- Unit tests
- Integration tests
- Fixture usage
- Parametrized tests
- Performance tests
"""

import pytest
import numpy as np
from pathlib import Path


@pytest.mark.unit
def test_sample_image_fixture(sample_image: np.ndarray):
    """Test that sample image fixture creates valid image."""
    assert sample_image.shape == (800, 1000, 3)
    assert sample_image.dtype == np.uint8
    assert sample_image.min() >= 0
    assert sample_image.max() <= 255


@pytest.mark.unit
def test_sample_image_file(sample_image_file: Path):
    """Test that sample image file is created."""
    assert sample_image_file.exists()
    assert sample_image_file.suffix == ".png"


@pytest.mark.unit
def test_mock_room_result(mock_room_result: dict, assert_valid_room):
    """Test mock room result is valid."""
    assert_valid_room(mock_room_result)
    assert mock_room_result["id"] == "room_001"
    assert mock_room_result["confidence"] > 0.9


@pytest.mark.unit
def test_mock_detection_result(mock_detection_result: dict, assert_valid_result):
    """Test mock detection result is valid."""
    assert_valid_result(mock_detection_result)
    assert mock_detection_result["status"] == "completed"
    assert mock_detection_result["roomCount"] == 1


@pytest.mark.integration
def test_s3_client(s3_client, sample_image_bytes: bytes):
    """Test S3 client with mocked AWS."""
    # Upload test file
    s3_client.put_object(
        Bucket="test-blueprints", Key="test/blueprint.png", Body=sample_image_bytes
    )

    # Verify file exists
    response = s3_client.list_objects_v2(Bucket="test-blueprints", Prefix="test/")
    assert response["KeyCount"] == 1
    assert response["Contents"][0]["Key"] == "test/blueprint.png"


@pytest.mark.integration
def test_dynamodb_client(dynamodb_client):
    """Test DynamoDB client with mocked AWS."""
    # Put item
    dynamodb_client.put_item(
        TableName="location-detection-jobs",
        Item={"jobId": {"S": "test-123"}, "status": {"S": "completed"}},
    )

    # Get item
    response = dynamodb_client.get_item(
        TableName="location-detection-jobs", Key={"jobId": {"S": "test-123"}}
    )

    assert "Item" in response
    assert response["Item"]["jobId"]["S"] == "test-123"
    assert response["Item"]["status"]["S"] == "completed"


@pytest.mark.parametrize(
    "area,perimeter,expected_ratio",
    [
        (100, 40, 2.5),  # Square
        (100, 50, 2.0),  # Rectangle
        (100, 60, 1.67),  # Long rectangle
    ],
)
def test_area_perimeter_ratio(area: float, perimeter: float, expected_ratio: float):
    """Test area to perimeter ratio calculation."""
    ratio = area / perimeter
    assert pytest.approx(ratio, abs=0.01) == expected_ratio


@pytest.mark.slow
def test_large_image_processing(large_image: np.ndarray):
    """Test processing large images."""
    assert large_image.shape == (2000, 3000, 3)
    # Simulate processing
    processed = large_image.mean(axis=2)
    assert processed.shape == (2000, 3000)


@pytest.mark.unit
class TestRoomDetection:
    """Group of tests for room detection."""

    def test_room_has_required_fields(self, mock_room_result: dict):
        """Test room has all required fields."""
        required_fields = ["id", "polygon", "lines", "area", "perimeter"]
        for field in required_fields:
            assert field in mock_room_result

    def test_room_polygon_closed(self, mock_room_result: dict):
        """Test room polygon is closed."""
        polygon = mock_room_result["polygon"]
        assert len(polygon) >= 3
        # First and last points should be close or equal
        first = polygon[0]
        last = polygon[-1]
        assert first == last or np.linalg.norm(np.array(first) - np.array(last)) < 1e-6

    def test_room_area_positive(self, mock_room_result: dict):
        """Test room area is positive."""
        assert mock_room_result["area"] > 0

    def test_room_lines_match_polygon(self, mock_room_result: dict):
        """Test room lines correspond to polygon edges."""
        polygon = mock_room_result["polygon"]
        lines = mock_room_result["lines"]

        # Number of lines should match number of polygon edges
        assert len(lines) == len(polygon) or len(lines) == len(polygon) - 1


@pytest.mark.unit
def test_lambda_context(lambda_context):
    """Test Lambda context fixture."""
    assert lambda_context.function_name == "location-detection-handler"
    assert lambda_context.memory_limit_in_mb == 2048
    assert lambda_context.get_remaining_time_in_millis() > 0


# Example of testing for exceptions
@pytest.mark.unit
def test_invalid_room_raises_error():
    """Test that invalid room data raises appropriate errors."""
    invalid_room = {"id": "room_001"}  # Missing required fields

    with pytest.raises((KeyError, ValueError)):
        # This would be actual validation code
        required = ["polygon", "lines", "area"]
        for field in required:
            _ = invalid_room[field]


# Example of testing with temporary files
@pytest.mark.unit
def test_temp_file_creation(tmp_path: Path):
    """Test creating temporary files."""
    test_file = tmp_path / "test.txt"
    test_file.write_text("Hello, World!")

    assert test_file.read_text() == "Hello, World!"
    assert test_file.exists()


if __name__ == "__main__":
    # Allow running tests directly
    pytest.main([__file__, "-v"])
