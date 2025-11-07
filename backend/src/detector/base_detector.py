"""Abstract base class for room boundary detectors."""
from abc import ABC, abstractmethod
from typing import List, Dict, Any
import numpy as np


class BaseDetector(ABC):
    """Abstract base class for room boundary detectors."""

    @abstractmethod
    def detect_rooms(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """
        Detect room boundaries from blueprint image.

        Args:
            image: Input blueprint image as numpy array

        Returns:
            List of detected rooms with lines and polygons
        """
        pass

    @abstractmethod
    def preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """
        Preprocess image before detection.

        Args:
            image: Raw input image

        Returns:
            Preprocessed image ready for detection
        """
        pass
