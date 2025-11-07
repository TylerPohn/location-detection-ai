"""
OpenCV-based room detection for blueprint images.
This is a copy of the detector from PR-4 for containerization.
"""

import cv2
import numpy as np
from typing import List, Dict, Any, Tuple


class OpenCVDetector:
    """
    OpenCV-based detector for identifying rooms in blueprint images.
    """

    def __init__(
        self,
        min_area: int = 1000,
        max_area: int = 1000000,
        epsilon_factor: float = 0.01
    ):
        """
        Initialize the detector with configuration parameters.

        Args:
            min_area: Minimum contour area to consider as a room
            max_area: Maximum contour area to consider as a room
            epsilon_factor: Factor for contour approximation (lower = more vertices)
        """
        self.min_area = min_area
        self.max_area = max_area
        self.epsilon_factor = epsilon_factor

    def detect_rooms(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """
        Detect rooms in a blueprint image.

        Args:
            image: Input image as numpy array (BGR format)

        Returns:
            List of detected rooms with metadata
        """
        if image is None or image.size == 0:
            raise ValueError("Invalid input image")

        # Preprocess image
        processed = self._preprocess_image(image)

        # Find contours
        contours, hierarchy = cv2.findContours(
            processed,
            cv2.RETR_CCOMP,
            cv2.CHAIN_APPROX_SIMPLE
        )

        rooms = []
        for idx, contour in enumerate(contours):
            # Filter by area
            area = cv2.contourArea(contour)
            if area < self.min_area or area > self.max_area:
                continue

            # Check if it's an outer contour (not a hole)
            if hierarchy[0][idx][3] != -1:
                continue

            # Approximate contour to polygon
            epsilon = self.epsilon_factor * cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, epsilon, True)

            # Filter by vertex count (rooms typically have 4+ corners)
            if len(approx) < 4:
                continue

            # Calculate bounding box
            x, y, w, h = cv2.boundingRect(contour)

            # Extract polygon vertices
            vertices = [
                {'x': int(point[0][0]), 'y': int(point[0][1])}
                for point in approx
            ]

            rooms.append({
                'id': len(rooms),
                'area': float(area),
                'vertices': vertices,
                'bounding_box': {
                    'x': int(x),
                    'y': int(y),
                    'width': int(w),
                    'height': int(h)
                },
                'confidence': self._calculate_confidence(contour, approx)
            })

        return rooms

    def _preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """
        Preprocess blueprint image for contour detection.

        Args:
            image: Input BGR image

        Returns:
            Binary image ready for contour detection
        """
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)

        # Apply adaptive thresholding
        binary = cv2.adaptiveThreshold(
            blurred,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV,
            11,
            2
        )

        # Morphological operations to clean up
        kernel = np.ones((3, 3), np.uint8)
        cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN, kernel)

        return cleaned

    def _calculate_confidence(
        self,
        contour: np.ndarray,
        approx: np.ndarray
    ) -> float:
        """
        Calculate confidence score for a detected room.

        Args:
            contour: Original contour
            approx: Approximated polygon

        Returns:
            Confidence score between 0 and 1
        """
        # Simple heuristic based on how rectangular the shape is
        area = cv2.contourArea(contour)
        x, y, w, h = cv2.boundingRect(contour)
        bbox_area = w * h

        if bbox_area == 0:
            return 0.0

        # Rectangularity: how well the contour fills its bounding box
        rectangularity = area / bbox_area

        # Polygon simplicity: fewer vertices is more confident
        vertex_score = max(0, 1 - (len(approx) - 4) * 0.1)

        # Combined confidence
        confidence = (rectangularity * 0.7 + vertex_score * 0.3)

        return min(1.0, max(0.0, confidence))
