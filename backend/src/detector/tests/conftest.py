"""Test fixtures for detector tests."""
import pytest
import numpy as np
import cv2


@pytest.fixture
def simple_room_blueprint():
    """Create a simple single-room blueprint for testing."""
    # Create blank white image
    image = np.ones((500, 500, 3), dtype=np.uint8) * 255

    # Draw a simple rectangular room (black walls)
    cv2.rectangle(image, (100, 100), (400, 400), (0, 0, 0), 2)

    return image


@pytest.fixture
def multi_room_blueprint():
    """Create a multi-room blueprint for testing."""
    image = np.ones((600, 800, 3), dtype=np.uint8) * 255

    # Draw three rooms
    # Room 1 - top left
    cv2.rectangle(image, (50, 50), (300, 250), (0, 0, 0), 2)

    # Room 2 - top right
    cv2.rectangle(image, (350, 50), (750, 250), (0, 0, 0), 2)

    # Room 3 - bottom (large)
    cv2.rectangle(image, (50, 300), (750, 550), (0, 0, 0), 2)

    return image


@pytest.fixture
def irregular_room_blueprint():
    """Create an L-shaped room for testing irregular shapes."""
    image = np.ones((500, 500, 3), dtype=np.uint8) * 255

    # Draw L-shaped room
    points = np.array([
        [100, 100],
        [400, 100],
        [400, 250],
        [250, 250],
        [250, 400],
        [100, 400]
    ], dtype=np.int32)

    cv2.polylines(image, [points], True, (0, 0, 0), 2)

    return image


@pytest.fixture
def noisy_blueprint():
    """Create a blueprint with noise and artifacts."""
    image = np.ones((500, 500, 3), dtype=np.uint8) * 255

    # Draw main room
    cv2.rectangle(image, (100, 100), (400, 400), (0, 0, 0), 2)

    # Add noise
    noise = np.random.randint(0, 50, (500, 500, 3), dtype=np.uint8)
    image = cv2.subtract(image, noise)

    # Add small artifacts that should be filtered out
    cv2.circle(image, (50, 50), 5, (0, 0, 0), -1)
    cv2.circle(image, (450, 450), 3, (0, 0, 0), -1)

    return image
