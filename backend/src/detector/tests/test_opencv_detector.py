"""Unit tests for OpenCVDetector."""
import pytest
import numpy as np
import cv2
import sys
import os

# Add parent directory to path to import detector modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from opencv_detector import OpenCVDetector


class TestOpenCVDetector:

    def test_initialization(self):
        """Test detector can be initialized with default parameters."""
        detector = OpenCVDetector()
        assert detector.min_area == 1000
        assert detector.max_area == 1000000
        assert detector.epsilon_factor == 0.01

    def test_initialization_custom_params(self):
        """Test detector accepts custom parameters."""
        detector = OpenCVDetector(min_area=500, max_area=500000, epsilon_factor=0.02)
        assert detector.min_area == 500
        assert detector.max_area == 500000
        assert detector.epsilon_factor == 0.02

    def test_preprocess_grayscale(self, simple_room_blueprint):
        """Test preprocessing converts to binary image."""
        detector = OpenCVDetector()
        processed = detector.preprocess_image(simple_room_blueprint)

        # Should be grayscale (2D array)
        assert len(processed.shape) == 2

        # Should be binary (only 0 and 255)
        unique_values = np.unique(processed)
        assert len(unique_values) <= 2

    def test_detect_single_room(self, simple_room_blueprint):
        """Test detection of single rectangular room."""
        detector = OpenCVDetector()
        rooms = detector.detect_rooms(simple_room_blueprint)

        # Should detect at least one room
        assert len(rooms) >= 1

        # Check room structure
        room = rooms[0]
        assert 'id' in room
        assert 'lines' in room
        assert 'polygon' in room
        assert 'area' in room
        assert 'perimeter' in room

        # Should have 4 lines for rectangle
        assert len(room['lines']) >= 4

        # Each line should have start and end
        for line in room['lines']:
            assert 'start' in line
            assert 'end' in line
            assert len(line['start']) == 2
            assert len(line['end']) == 2

    def test_detect_multiple_rooms(self, multi_room_blueprint):
        """Test detection of multiple rooms."""
        detector = OpenCVDetector()
        rooms = detector.detect_rooms(multi_room_blueprint)

        # Should detect multiple rooms (at least 2)
        assert len(rooms) >= 2

        # Each room should have unique ID
        room_ids = [room['id'] for room in rooms]
        assert len(room_ids) == len(set(room_ids))

    def test_detect_irregular_room(self, irregular_room_blueprint):
        """Test detection of non-rectangular room."""
        detector = OpenCVDetector()
        rooms = detector.detect_rooms(irregular_room_blueprint)

        assert len(rooms) >= 1

        # L-shaped room should have 6 vertices
        room = rooms[0]
        assert len(room['polygon']) >= 4  # At least 4 points

    def test_filter_small_artifacts(self, noisy_blueprint):
        """Test that small noise artifacts are filtered out."""
        detector = OpenCVDetector(min_area=2000)
        rooms = detector.detect_rooms(noisy_blueprint)

        # Should detect main room but not small noise circles
        # Small circles have area < 2000
        for room in rooms:
            assert room['area'] >= 2000

    def test_polygon_to_lines_conversion(self):
        """Test polygon to lines conversion."""
        detector = OpenCVDetector()
        polygon = [[0, 0], [100, 0], [100, 100], [0, 100]]

        lines = detector._polygon_to_lines(polygon)

        assert len(lines) == 4
        assert lines[0] == {"start": [0, 0], "end": [100, 0]}
        assert lines[1] == {"start": [100, 0], "end": [100, 100]}
        assert lines[2] == {"start": [100, 100], "end": [0, 100]}
        assert lines[3] == {"start": [0, 100], "end": [0, 0]}  # Closes polygon

    def test_area_calculation(self, simple_room_blueprint):
        """Test that area is calculated correctly."""
        detector = OpenCVDetector()
        rooms = detector.detect_rooms(simple_room_blueprint)

        assert len(rooms) >= 1

        # Room should have positive area
        assert rooms[0]['area'] > 0

    def test_visualization(self, simple_room_blueprint):
        """Test visualization function runs without errors."""
        detector = OpenCVDetector()
        rooms = detector.detect_rooms(simple_room_blueprint)

        result = detector.visualize_detections(simple_room_blueprint, rooms)

        # Should return same shape as input
        assert result.shape == simple_room_blueprint.shape

        # Should be different from input (has drawings)
        assert not np.array_equal(result, simple_room_blueprint)

    def test_empty_image(self):
        """Test detector handles empty image gracefully."""
        detector = OpenCVDetector()
        empty_image = np.ones((500, 500, 3), dtype=np.uint8) * 255
        rooms = detector.detect_rooms(empty_image)

        # Should return empty list for blank image
        assert len(rooms) == 0

    def test_minimum_polygon_points(self):
        """Test that polygons with < 4 points are filtered."""
        detector = OpenCVDetector()
        image = np.ones((500, 500, 3), dtype=np.uint8) * 255

        # Draw a small triangle (3 points)
        points = np.array([[100, 100], [150, 100], [125, 150]], dtype=np.int32)
        cv2.polylines(image, [points], True, (0, 0, 0), 2)
        cv2.fillPoly(image, [points], (0, 0, 0))

        rooms = detector.detect_rooms(image)

        # Triangle should be filtered out (< 4 points)
        # Or if detected, should have been approximated to 4+ points
        for room in rooms:
            assert len(room['polygon']) >= 4
