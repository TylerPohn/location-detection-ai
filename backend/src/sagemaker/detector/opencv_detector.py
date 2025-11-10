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
        min_area: int = 50000,  # Increased from 1000 - rooms are larger
        max_area: int = 5000000,  # Increased from 1000000 for larger rooms
        epsilon_factor: float = 0.02,  # Increased for simpler polygons
        min_vertices: int = 4,  # Minimum vertices for a room polygon
        max_vertices: int = 50,  # Maximum vertices to avoid noise
        line_thickness: int = 2  # Expected line thickness in pixels
    ):
        """
        Initialize the detector with configuration parameters.

        Args:
            min_area: Minimum contour area to consider as a room
            max_area: Maximum contour area to consider as a room
            epsilon_factor: Factor for contour approximation (lower = more vertices)
            min_vertices: Minimum number of vertices for valid room polygon
            max_vertices: Maximum number of vertices to filter out noise
            line_thickness: Expected thickness of lines in floor plan
        """
        self.min_area = min_area
        self.max_area = max_area
        self.epsilon_factor = epsilon_factor
        self.min_vertices = min_vertices
        self.max_vertices = max_vertices
        self.line_thickness = line_thickness

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

        # Find contours - use RETR_TREE to get all hierarchy levels
        contours, hierarchy = cv2.findContours(
            processed,
            cv2.RETR_TREE,
            cv2.CHAIN_APPROX_SIMPLE
        )

        # Filter and sort contours
        valid_contours = []
        for idx, contour in enumerate(contours):
            # Filter by area first
            area = cv2.contourArea(contour)
            if area < self.min_area or area > self.max_area:
                continue

            # Approximate contour to polygon
            epsilon = self.epsilon_factor * cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, epsilon, True)

            # Filter by vertex count
            if len(approx) < self.min_vertices or len(approx) > self.max_vertices:
                continue

            # Calculate aspect ratio to filter out very elongated shapes
            x, y, w, h = cv2.boundingRect(contour)
            aspect_ratio = max(w, h) / max(min(w, h), 1)
            if aspect_ratio > 10:  # Skip very elongated shapes
                continue

            valid_contours.append((idx, contour, approx, area, (x, y, w, h)))

        # Sort by area (largest first) to prioritize main rooms
        valid_contours.sort(key=lambda x: x[3], reverse=True)

        rooms = []
        for idx, contour, approx, area, (x, y, w, h) in valid_contours:
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
                'confidence': self._calculate_confidence(contour, approx, w, h)
            })

        return rooms

    def _preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """
        Preprocess blueprint image for contour detection.
        Optimized for black lines on white background.

        Args:
            image: Input BGR image

        Returns:
            Binary image ready for contour detection
        """
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Invert if necessary (we want dark lines on white background to become white on black)
        # Check if image is mostly white (mean > 127)
        if gray.mean() > 127:
            gray = cv2.bitwise_not(gray)

        # Apply bilateral filter to preserve edges while reducing noise
        filtered = cv2.bilateralFilter(gray, 9, 75, 75)

        # Use Otsu's thresholding for better binary conversion
        _, binary = cv2.threshold(filtered, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        # Dilate lines slightly to connect nearby segments
        dilate_kernel = np.ones((self.line_thickness, self.line_thickness), np.uint8)
        dilated = cv2.dilate(binary, dilate_kernel, iterations=1)

        # Fill small holes inside rooms
        kernel = np.ones((5, 5), np.uint8)
        closed = cv2.morphologyEx(dilated, cv2.MORPH_CLOSE, kernel, iterations=2)

        # Remove small noise
        opened = cv2.morphologyEx(closed, cv2.MORPH_OPEN, kernel, iterations=1)

        return opened

    def _calculate_confidence(
        self,
        contour: np.ndarray,
        approx: np.ndarray,
        width: int,
        height: int
    ) -> float:
        """
        Calculate confidence score for a detected room.

        Args:
            contour: Original contour
            approx: Approximated polygon
            width: Bounding box width
            height: Bounding box height

        Returns:
            Confidence score between 0 and 1
        """
        area = cv2.contourArea(contour)
        bbox_area = width * height

        if bbox_area == 0:
            return 0.0

        # Rectangularity: how well the contour fills its bounding box
        rectangularity = area / bbox_area

        # Polygon simplicity: prefer 4-8 vertices (typical rooms)
        num_vertices = len(approx)
        if num_vertices <= 8:
            vertex_score = 1.0 - (abs(num_vertices - 4) * 0.1)
        else:
            vertex_score = max(0, 1.0 - (num_vertices - 8) * 0.05)

        # Size score: prefer medium to large rooms
        # Normalize by image area (assuming 3000x3000 images)
        size_ratio = area / (3000 * 3000)
        if 0.01 < size_ratio < 0.25:  # 1% to 25% of image
            size_score = 1.0
        elif size_ratio < 0.01:
            size_score = size_ratio / 0.01  # Penalize very small
        else:
            size_score = max(0.5, 1.0 - (size_ratio - 0.25))  # Penalize very large

        # Aspect ratio score: rooms are usually not too elongated
        aspect_ratio = max(width, height) / max(min(width, height), 1)
        if aspect_ratio < 3:
            aspect_score = 1.0
        else:
            aspect_score = max(0.3, 1.0 - (aspect_ratio - 3) * 0.1)

        # Combined confidence with weights
        confidence = (
            rectangularity * 0.3 +
            vertex_score * 0.25 +
            size_score * 0.25 +
            aspect_score * 0.2
        )

        return min(1.0, max(0.0, confidence))
