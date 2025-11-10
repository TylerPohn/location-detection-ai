"""
YOLOv8-based room detection for blueprint images.
Replaces OpenCV detector with AI-powered detection.
"""

import numpy as np
from typing import List, Dict, Any
from pathlib import Path


class YOLODetector:
    """
    YOLOv8-based detector for identifying rooms in blueprint images.
    """

    # Room class mapping (must match training data)
    CLASS_NAMES = {
        0: 'Bedroom',
        1: 'LivingRoom',
        2: 'Kitchen',
        3: 'Bathroom',
        4: 'Dining',
        5: 'Entry',
        6: 'Closet',
        7: 'Utility',
        8: 'Outdoor',
        9: 'Other'
    }

    def __init__(
        self,
        model_path: str = '/var/task/models/best.pt',
        conf_threshold: float = 0.25,
        iou_threshold: float = 0.45
    ):
        """
        Initialize the YOLO detector.

        Args:
            model_path: Path to trained YOLO model weights
            conf_threshold: Confidence threshold for detections (0-1)
            iou_threshold: IoU threshold for NMS (0-1)
        """
        self.model_path = model_path
        self.conf_threshold = conf_threshold
        self.iou_threshold = iou_threshold
        self.model = None

        # Lazy load model on first inference
        self._load_model()

    def _load_model(self):
        """Load YOLO model from weights file."""
        try:
            from ultralytics import YOLO
            print(f"Loading YOLO model from {self.model_path}")
            self.model = YOLO(self.model_path)
            print("YOLO model loaded successfully")
        except ImportError:
            print("ERROR: ultralytics not installed. Install with: pip install ultralytics")
            raise
        except Exception as e:
            print(f"ERROR: Failed to load YOLO model: {e}")
            raise

    def detect_rooms(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """
        Detect rooms in a blueprint image.

        Args:
            image: Input image as numpy array (BGR format)

        Returns:
            List of detected rooms with metadata in required format:
            [
                {
                    'id': 'room_001',
                    'bounding_box': [x_min, y_min, x_max, y_max],  # 0-1000 range
                    'name_hint': 'Kitchen',
                    'confidence': 0.92
                }
            ]
        """
        if image is None or image.size == 0:
            raise ValueError("Invalid input image")

        if self.model is None:
            raise RuntimeError("YOLO model not loaded")

        # Get image dimensions
        img_height, img_width = image.shape[:2]

        # Run YOLO inference
        results = self.model(
            image,
            conf=self.conf_threshold,
            iou=self.iou_threshold,
            verbose=False
        )

        rooms = []

        # Process detections
        for result in results:
            boxes = result.boxes

            for i, box in enumerate(boxes):
                # Extract box coordinates (xyxy format)
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()

                # Extract confidence and class
                confidence = float(box.conf[0].cpu().numpy())
                class_id = int(box.cls[0].cpu().numpy())

                # Normalize to 0-1000 range (as per API requirements)
                x_min = int((x1 / img_width) * 1000)
                y_min = int((y1 / img_height) * 1000)
                x_max = int((x2 / img_width) * 1000)
                y_max = int((y2 / img_height) * 1000)

                # Clamp to valid range
                x_min = max(0, min(1000, x_min))
                y_min = max(0, min(1000, y_min))
                x_max = max(0, min(1000, x_max))
                y_max = max(0, min(1000, y_max))

                # Build room object in required format
                room = {
                    'id': f"room_{str(len(rooms) + 1).zfill(3)}",
                    'bounding_box': [x_min, y_min, x_max, y_max],
                    'name_hint': self.CLASS_NAMES.get(class_id, 'Unknown'),
                    'confidence': round(confidence, 3)
                }

                rooms.append(room)

        # Sort by area (largest first) for consistent ordering
        rooms.sort(key=lambda r: (r['bounding_box'][2] - r['bounding_box'][0]) *
                                  (r['bounding_box'][3] - r['bounding_box'][1]),
                   reverse=True)

        # Re-assign IDs after sorting
        for i, room in enumerate(rooms):
            room['id'] = f"room_{str(i + 1).zfill(3)}"

        return rooms

    def get_model_info(self) -> Dict[str, Any]:
        """
        Get information about the loaded model.

        Returns:
            Dictionary with model metadata
        """
        if self.model is None:
            return {'loaded': False}

        return {
            'loaded': True,
            'model_path': self.model_path,
            'conf_threshold': self.conf_threshold,
            'iou_threshold': self.iou_threshold,
            'num_classes': len(self.CLASS_NAMES),
            'class_names': self.CLASS_NAMES
        }


def main():
    """Test YOLO detector on sample image."""
    import sys
    import cv2

    if len(sys.argv) < 2:
        print("Usage: python yolo_detector.py <image_path> [model_path]")
        sys.exit(1)

    image_path = sys.argv[1]
    model_path = sys.argv[2] if len(sys.argv) > 2 else 'models/best.pt'

    # Load image
    image = cv2.imread(image_path)
    if image is None:
        print(f"Error: Could not load image from {image_path}")
        sys.exit(1)

    print(f"Loaded image: {image.shape}")

    # Initialize detector
    try:
        detector = YOLODetector(model_path=model_path)
    except Exception as e:
        print(f"Error initializing detector: {e}")
        sys.exit(1)

    # Run detection
    print("\nRunning room detection...")
    rooms = detector.detect_rooms(image)

    # Print results
    print(f"\n{'='*60}")
    print(f"YOLO Room Detection Results")
    print(f"{'='*60}")
    print(f"Image: {image_path}")
    print(f"Dimensions: {image.shape[1]}x{image.shape[0]}")
    print(f"Rooms detected: {len(rooms)}")
    print(f"\n{'='*60}")
    print("Detected Rooms:")
    print(f"{'='*60}")

    for room in rooms:
        print(f"\n{room['id']}: {room['name_hint']} (confidence: {room['confidence']:.2f})")
        bbox = room['bounding_box']
        print(f"  Bounding box: [{bbox[0]}, {bbox[1]}, {bbox[2]}, {bbox[3]}]")
        width = bbox[2] - bbox[0]
        height = bbox[3] - bbox[1]
        print(f"  Size: {width} x {height} (normalized 0-1000)")

    # Print JSON output
    import json
    print(f"\n{'='*60}")
    print("JSON Output (API Format):")
    print(f"{'='*60}")
    print(json.dumps(rooms, indent=2))


if __name__ == '__main__':
    main()
