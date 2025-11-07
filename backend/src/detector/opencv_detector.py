"""OpenCV-based room boundary detector using contour analysis."""
import cv2
import numpy as np
from typing import List, Dict, Any
from base_detector import BaseDetector


class OpenCVDetector(BaseDetector):
    """OpenCV-based room boundary detector using contour analysis."""

    def __init__(
        self,
        min_area: int = 1000,
        max_area: int = 1000000,
        epsilon_factor: float = 0.01,
    ):
        """
        Initialize OpenCV detector.

        Args:
            min_area: Minimum contour area to consider as a room
            max_area: Maximum contour area to consider as a room
            epsilon_factor: Douglas-Peucker approximation factor
        """
        self.min_area = min_area
        self.max_area = max_area
        self.epsilon_factor = epsilon_factor

    def preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """
        Preprocess blueprint image for contour detection.

        Steps:
        1. Convert to grayscale
        2. Apply Gaussian blur to reduce noise
        3. Adaptive thresholding to handle varying lighting
        4. Morphological operations to close gaps

        Args:
            image: RGB/BGR input image

        Returns:
            Binary image ready for contour detection
        """
        # Convert to grayscale
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()

        # Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)

        # Adaptive thresholding
        binary = cv2.adaptiveThreshold(
            blurred,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV,
            11,
            2
        )

        # Morphological closing to fill small gaps in walls
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        closed = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=2)

        return closed

    def detect_rooms(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """
        Detect room boundaries using contour analysis.

        Args:
            image: Input blueprint image

        Returns:
            List of detected rooms with format:
            [
                {
                    "id": "room_001",
                    "lines": [{"start": [x1, y1], "end": [x2, y2]}, ...],
                    "polygon": [[x1, y1], [x2, y2], ...],
                    "area": 12345.67,
                    "perimeter": 456.78
                }
            ]
        """
        # Preprocess image
        processed = self.preprocess_image(image)

        # Find contours
        contours, hierarchy = cv2.findContours(
            processed,
            cv2.RETR_TREE,
            cv2.CHAIN_APPROX_SIMPLE
        )

        rooms = []
        room_id = 1

        for idx, contour in enumerate(contours):
            # Filter by area
            area = cv2.contourArea(contour)
            if area < self.min_area or area > self.max_area:
                continue

            # Approximate contour to polygon
            epsilon = self.epsilon_factor * cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, epsilon, True)

            # Skip if too few points (not a room)
            if len(approx) < 4:
                continue

            # Convert to polygon points
            polygon = [[int(point[0][0]), int(point[0][1])] for point in approx]

            # Convert polygon to line segments
            lines = self._polygon_to_lines(polygon)

            # Calculate perimeter
            perimeter = cv2.arcLength(contour, True)

            room = {
                "id": f"room_{room_id:03d}",
                "lines": lines,
                "polygon": polygon,
                "area": float(area),
                "perimeter": float(perimeter),
            }

            rooms.append(room)
            room_id += 1

        return rooms

    def _polygon_to_lines(self, polygon: List[List[int]]) -> List[Dict[str, List[int]]]:
        """
        Convert polygon points to line segments.

        Args:
            polygon: List of [x, y] points

        Returns:
            List of line segments with start and end points
        """
        lines = []
        num_points = len(polygon)

        for i in range(num_points):
            start = polygon[i]
            end = polygon[(i + 1) % num_points]  # Wrap around to close polygon

            lines.append({
                "start": start,
                "end": end
            })

        return lines

    def visualize_detections(
        self,
        image: np.ndarray,
        rooms: List[Dict[str, Any]]
    ) -> np.ndarray:
        """
        Draw detected rooms on image for visualization.

        Args:
            image: Original image
            rooms: Detected rooms from detect_rooms()

        Returns:
            Image with drawn room boundaries
        """
        output = image.copy()

        for room in rooms:
            # Draw polygon
            polygon = np.array(room['polygon'], dtype=np.int32)
            cv2.polylines(output, [polygon], True, (0, 255, 0), 2)

            # Draw room ID
            centroid = polygon.mean(axis=0).astype(int)
            cv2.putText(
                output,
                room['id'],
                tuple(centroid),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (255, 0, 0),
                2
            )

        return output
