# PR-4: OpenCV Room Boundary Detector

## Overview
Implement the core computer vision algorithm using OpenCV to detect room boundaries from blueprint images and output line/polygon geometry.

## Dependencies
**Requires:** PR-3 (S3 Storage and API Gateway)

## Objectives
- Create Python-based OpenCV detector class
- Implement contour detection algorithm
- Convert contours to line segments and polygons
- Add image preprocessing pipeline
- Create unit tests with mock blueprint images
- Package detector for Lambda deployment

## Detailed Steps

### 1. Set Up Python Project Structure
**Estimated Time:** 25 minutes

```bash
# Create detector module structure
mkdir -p backend/src/detector
cd backend/src/detector

# Initialize Python project
cat > pyproject.toml << 'EOF'
[tool.poetry]
name = "location-detector"
version = "0.1.0"
description = "OpenCV-based room boundary detector"
authors = ["Innergy AI Team"]

[tool.poetry.dependencies]
python = "^3.9"
opencv-python = "^4.8.0"
numpy = "^1.24.0"
pillow = "^10.0.0"

[tool.poetry.dev-dependencies]
pytest = "^7.4.0"
pytest-cov = "^4.1.0"
black = "^23.7.0"
mypy = "^1.4.0"
pylint = "^2.17.0"

[build-system]
requires = ["poetry-core>=1.0.0"]
build-backend = "poetry.core.masonry.api"
EOF

# Install dependencies
poetry install
```

**Verification:** Run `poetry show` to confirm dependencies are installed.

### 2. Create Base Detector Interface
**Estimated Time:** 20 minutes

```python
# backend/src/detector/base_detector.py
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
```

**Verification:** Run `poetry run python -c "from base_detector import BaseDetector; print('OK')"`.

### 3. Implement OpenCV Detector
**Estimated Time:** 60 minutes

```python
# backend/src/detector/opencv_detector.py
import cv2
import numpy as np
from typing import List, Dict, Any, Tuple
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
```

**Verification:** Run `poetry run python -c "from opencv_detector import OpenCVDetector; d = OpenCVDetector(); print('OK')"`.

### 4. Create Test Fixtures with Mock Blueprints
**Estimated Time:** 40 minutes

```python
# backend/src/detector/tests/conftest.py
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
```

**Verification:** Run `poetry run pytest tests/conftest.py --collect-only` to verify fixtures.

### 5. Write Unit Tests
**Estimated Time:** 45 minutes

```python
# backend/src/detector/tests/test_opencv_detector.py
import pytest
import numpy as np
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
```

**Verification:** Run `poetry run pytest tests/test_opencv_detector.py -v`.

### 6. Create CLI for Local Testing
**Estimated Time:** 30 minutes

```python
# backend/src/detector/cli.py
import argparse
import cv2
import json
from pathlib import Path
from opencv_detector import OpenCVDetector

def main():
    parser = argparse.ArgumentParser(description='Detect room boundaries from blueprint')
    parser.add_argument('input', type=str, help='Input blueprint image path')
    parser.add_argument('--output', type=str, help='Output JSON path', default='output.json')
    parser.add_argument('--visualize', type=str, help='Save visualization image path')
    parser.add_argument('--min-area', type=int, default=1000, help='Minimum room area')
    parser.add_argument('--max-area', type=int, default=1000000, help='Maximum room area')

    args = parser.parse_args()

    # Load image
    print(f"Loading image: {args.input}")
    image = cv2.imread(args.input)
    if image is None:
        print(f"Error: Could not load image at {args.input}")
        return 1

    print(f"Image size: {image.shape}")

    # Detect rooms
    print("Detecting rooms...")
    detector = OpenCVDetector(min_area=args.min_area, max_area=args.max_area)
    rooms = detector.detect_rooms(image)

    print(f"Detected {len(rooms)} rooms")

    # Save results as JSON
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w') as f:
        json.dump(rooms, f, indent=2)

    print(f"Results saved to: {args.output}")

    # Visualize if requested
    if args.visualize:
        print(f"Creating visualization...")
        viz = detector.visualize_detections(image, rooms)
        cv2.imwrite(args.visualize, viz)
        print(f"Visualization saved to: {args.visualize}")

    return 0

if __name__ == '__main__':
    exit(main())
```

Make executable:

```bash
chmod +x cli.py
```

**Verification:** Run `poetry run python cli.py --help` to see usage.

### 7. Package for Lambda Deployment
**Estimated Time:** 35 minutes

```python
# backend/src/detector/lambda_handler.py
import json
import base64
import boto3
import cv2
import numpy as np
from opencv_detector import OpenCVDetector
from typing import Dict, Any

s3_client = boto3.client('s3')

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for room detection.

    Expected event format:
    {
        "bucket": "blueprint-bucket",
        "key": "blueprints/job_123.png",
        "jobId": "job_123",
        "params": {
            "min_area": 1000,
            "max_area": 1000000
        }
    }
    """
    try:
        # Extract parameters
        bucket = event['bucket']
        key = event['key']
        job_id = event['jobId']
        params = event.get('params', {})

        print(f"Processing job {job_id} from s3://{bucket}/{key}")

        # Download image from S3
        response = s3_client.get_object(Bucket=bucket, Key=key)
        image_bytes = response['Body'].read()

        # Decode image
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise ValueError("Failed to decode image")

        print(f"Image loaded: {image.shape}")

        # Detect rooms
        detector = OpenCVDetector(
            min_area=params.get('min_area', 1000),
            max_area=params.get('max_area', 1000000)
        )
        rooms = detector.detect_rooms(image)

        print(f"Detected {len(rooms)} rooms")

        # Prepare result
        result = {
            "jobId": job_id,
            "status": "completed",
            "roomCount": len(rooms),
            "rooms": rooms,
            "metadata": {
                "imageSize": list(image.shape),
                "parameters": params
            }
        }

        # Save result to S3
        results_bucket = event.get('resultsBucket', bucket)
        results_key = f"results/{job_id}.json"

        s3_client.put_object(
            Bucket=results_bucket,
            Key=results_key,
            Body=json.dumps(result),
            ContentType='application/json'
        )

        print(f"Results saved to s3://{results_bucket}/{results_key}")

        return {
            "statusCode": 200,
            "body": json.dumps(result)
        }

    except Exception as e:
        print(f"Error processing image: {str(e)}")

        error_result = {
            "jobId": event.get('jobId', 'unknown'),
            "status": "failed",
            "error": str(e)
        }

        return {
            "statusCode": 500,
            "body": json.dumps(error_result)
        }
```

Create requirements.txt for Lambda layer:

```txt
# backend/src/detector/requirements.txt
opencv-python-headless==4.8.0.76
numpy==1.24.3
boto3==1.28.25
```

**Verification:** Test Lambda handler locally with mock event.

## Acceptance Criteria

- [ ] OpenCVDetector class implemented with all methods
- [ ] Preprocessing pipeline handles grayscale conversion, blur, and thresholding
- [ ] Contour detection finds room boundaries
- [ ] Polygon approximation reduces contour points
- [ ] Output format matches PRD specification (lines and polygons)
- [ ] All unit tests pass with >90% coverage
- [ ] CLI tool works with sample blueprint images
- [ ] Lambda handler properly integrates with S3
- [ ] Code follows PEP 8 style guide
- [ ] Type hints added to all functions

## Testing Instructions

```bash
cd backend/src/detector

# Install dependencies
poetry install

# Run linting
poetry run black .
poetry run pylint opencv_detector.py

# Run type checking
poetry run mypy opencv_detector.py

# Run tests with coverage
poetry run pytest --cov=. --cov-report=html

# Test CLI with sample image
poetry run python cli.py tests/fixtures/sample_blueprint.png \
  --output results.json \
  --visualize output.png

# View results
cat results.json
open output.png  # macOS, or use image viewer
```

## Estimated Total Time
**4-5 hours** for a junior engineer following step-by-step.

## Next Steps
After PR-4 is merged:
- **PR-5** (SageMaker Deployment) - depends on this detector code

## Notes for Junior Engineers

- **OpenCV coordinates are (x, y) not (row, col)** - x is horizontal, y is vertical
- **Contours can be nested** - use hierarchy to filter
- **Preprocessing is critical** - bad preprocessing = bad detection
- **Test with real blueprints** - mock data is good but real data reveals issues
- **Tune parameters** - min_area, epsilon_factor affect results
- **Visualize intermediate steps** - save binary image to debug
- **NumPy arrays are mutable** - use .copy() when needed
