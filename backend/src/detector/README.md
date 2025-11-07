# Room Boundary Detector

OpenCV-based detector for identifying room boundaries from blueprint images.

## Installation

```bash
cd backend/src/detector
poetry install
```

## Usage

### CLI Tool

```bash
poetry run python cli.py input.png --output results.json --visualize output.png
```

### Lambda Deployment

Use `lambda_handler.py` for AWS Lambda deployment. Package with Lambda layer containing dependencies from `requirements.txt`.

## Testing

```bash
# Run tests with coverage
poetry run pytest --cov=. --cov-report=html

# Run linting
poetry run black .
poetry run pylint opencv_detector.py

# Type checking
poetry run mypy opencv_detector.py
```

## Architecture

- **BaseDetector**: Abstract interface for detectors
- **OpenCVDetector**: Contour-based implementation
- **CLI**: Local testing tool
- **Lambda Handler**: AWS deployment wrapper
