# YOLO Upgrade Plan: OpenCV → YOLOv8 Room Detection

## Executive Summary

**Current State**: OpenCV-based contour detection (rule-based, low accuracy)
**Target State**: YOLOv8 deep learning model (AI-powered, high accuracy)
**Dataset**: CubiCasa5k (992 high_quality + 3,732 high_quality_architectural samples)

---

## Dataset Analysis

### CubiCasa5k Structure
```
data/archive/cubicasa5k/cubicasa5k/
├── high_quality/              # 992 samples
│   └── {id}/
│       ├── F1_original.png    # Blueprint image
│       ├── F1_scaled.png      # Scaled version
│       └── model.svg          # Room annotations (polygons, labels)
└── high_quality_architectural/ # 3,732 samples
    └── {id}/
        ├── F1_original.png
        ├── F1_scaled.png
        └── model.svg
```

### SVG Annotation Format
- **Room polygons**: `<polygon>` elements with coordinates
- **Room labels**: `<text>` elements with room types (Kitchen, Bedroom, LivingRoom, etc.)
- **Room classes detected**:
  - Bedroom (MH = Master Bedroom)
  - Kitchen (K)
  - LivingRoom (OH)
  - Bathroom (KPH/WC)
  - Closet (VH)
  - Entry/Lobby (ET)
  - Balcony (PARVEKE)
  - Undefined spaces

---

## Implementation Plan

### Phase 1: Data Preprocessing (Week 1)

#### 1.1 SVG Annotation Parser
**File**: `backend/src/training/parsers/svg_parser.py`

```python
# Features:
- Parse SVG XML to extract room polygons
- Extract room type labels from class attributes
- Convert SVG coordinates to pixel coordinates
- Handle multi-floor plans (F1, F2, etc.)
- Filter out non-room elements (walls, doors, windows)
```

**Output**: JSON format
```json
{
  "image_id": "10004",
  "width": 1215,
  "height": 875,
  "rooms": [
    {
      "id": "room_001",
      "type": "Bedroom",
      "polygon": [[324, 513], [667, 513], ...],
      "bbox": [324, 513, 667, 849]
    }
  ]
}
```

#### 1.2 YOLO Dataset Converter
**File**: `backend/src/training/converters/yolo_converter.py`

```python
# Features:
- Convert polygon annotations to YOLO bounding boxes
- Normalize coordinates to [0, 1] range
- Create class mapping (Bedroom=0, Kitchen=1, etc.)
- Generate YOLO format: <class> <x_center> <y_center> <width> <height>
- Handle edge cases (overlapping rooms, irregular shapes)
```

**YOLO Label Format** (`labels/{id}.txt`):
```
0 0.456 0.723 0.282 0.384   # Bedroom at center (0.456, 0.723)
1 0.832 0.321 0.143 0.287   # Kitchen at center (0.832, 0.321)
```

#### 1.3 Data Split Strategy
**File**: `backend/src/training/data_split.py`

```python
# Split ratios:
- Train: 70% (3,307 samples)
- Validation: 15% (709 samples)
- Test: 15% (709 samples)

# Stratification:
- Ensure balanced room type distribution
- Separate by building ID (avoid data leakage)
```

---

### Phase 2: YOLO Training Pipeline (Week 2)

#### 2.1 YOLOv8 Configuration
**File**: `backend/src/training/configs/yolo_config.yaml`

```yaml
# Model configuration
model: yolov8m.pt  # Medium model (balance speed/accuracy)
imgsz: 640         # Input image size
batch: 16          # Batch size
epochs: 100        # Training epochs
patience: 20       # Early stopping patience

# Data augmentation
augment:
  hsv_h: 0.015     # Hue augmentation
  hsv_s: 0.7       # Saturation augmentation
  hsv_v: 0.4       # Value augmentation
  degrees: 10      # Rotation (±10°)
  translate: 0.1   # Translation (10%)
  scale: 0.5       # Scale (50%)
  flipud: 0.5      # Vertical flip
  fliplr: 0.5      # Horizontal flip
  mosaic: 1.0      # Mosaic augmentation

# Room class mapping
classes:
  0: Bedroom
  1: Kitchen
  2: LivingRoom
  3: Bathroom
  4: Closet
  5: Entry
  6: Balcony
  7: Dining
  8: Undefined
```

#### 2.2 Training Script
**File**: `backend/src/training/train_yolo.py`

```python
from ultralytics import YOLO
import torch

# Features:
- Load pre-trained YOLOv8 weights
- Custom room detection dataset
- TensorBoard logging
- Model checkpointing (best/last)
- Learning rate scheduling
- Multi-GPU support (if available)

# Training command:
# python train_yolo.py --config configs/yolo_config.yaml --data dataset.yaml
```

#### 2.3 Data Augmentation Pipeline
**File**: `backend/src/training/augmentation.py`

```python
# Augmentation strategies:
- Geometric: rotation, scaling, translation, flipping
- Color: brightness, contrast, saturation adjustments
- Noise: Gaussian noise, blur
- Perspective: minor perspective transforms
- Cutout: random occlusions (simulate furniture/text)
```

---

### Phase 3: Model Evaluation (Week 3)

#### 3.1 Evaluation Metrics
**File**: `backend/src/training/evaluate.py`

```python
# Metrics:
- mAP@0.5 (mean Average Precision at IoU=0.5)
- mAP@0.5:0.95 (average mAP from IoU=0.5 to 0.95)
- Precision per class
- Recall per class
- Confusion matrix
- Inference speed (FPS)

# Baseline targets:
- mAP@0.5 > 0.85 (85% accuracy)
- Inference: <200ms per image (Lambda timeout consideration)
```

#### 3.2 Validation Script
**File**: `backend/src/training/validate.py`

```python
# Validation features:
- Run inference on test set
- Calculate metrics
- Generate visualization (bounding boxes)
- Error analysis (false positives/negatives)
- Export results to JSON/CSV
```

---

### Phase 4: Lambda Integration (Week 4)

#### 4.1 YOLO Detector Wrapper
**File**: `backend/src/sagemaker/detector/yolo_detector.py`

```python
from ultralytics import YOLO
import numpy as np

class YOLODetector:
    def __init__(self, model_path: str):
        self.model = YOLO(model_path)
        self.class_names = {
            0: "Bedroom", 1: "Kitchen", 2: "LivingRoom",
            3: "Bathroom", 4: "Closet", 5: "Entry",
            6: "Balcony", 7: "Dining", 8: "Undefined"
        }

    def detect_rooms(self, image: np.ndarray) -> List[Dict]:
        results = self.model(image, conf=0.25, iou=0.45)
        rooms = []

        for r in results:
            for box in r.boxes:
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                conf = box.conf[0].cpu().numpy()
                cls = int(box.cls[0].cpu().numpy())

                # Normalize to 0-1000 range
                img_h, img_w = image.shape[:2]
                x_min = int((x1 / img_w) * 1000)
                y_min = int((y1 / img_h) * 1000)
                x_max = int((x2 / img_w) * 1000)
                y_max = int((y2 / img_h) * 1000)

                rooms.append({
                    'id': f"room_{len(rooms):03d}",
                    'bounding_box': [x_min, y_min, x_max, y_max],
                    'name_hint': self.class_names.get(cls),
                    'confidence': float(conf)
                })

        return rooms
```

#### 4.2 Lambda Handler Update
**File**: `backend/src/sagemaker/lambda_handler.py`

```python
# Changes:
- Import YOLODetector instead of OpenCVDetector
- Load YOLO model from S3 or container
- Handle PyTorch dependencies
- Add confidence threshold filtering
- Update result format to include room types
```

#### 4.3 Docker Container Update
**File**: `backend/src/sagemaker/Dockerfile`

```dockerfile
# Add PyTorch and Ultralytics
FROM public.ecr.aws/lambda/python:3.11

# Install system dependencies
RUN yum install -y libGL libgomp

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir \
    torch==2.1.0 \
    torchvision==0.16.0 \
    ultralytics==8.0.196 \
    opencv-python-headless==4.8.1.78 \
    pillow==10.0.1

# Copy model weights
COPY models/best.pt /var/task/models/

# Copy application code
COPY detector/ /var/task/detector/
COPY lambda_handler.py /var/task/

CMD ["lambda_handler.handler"]
```

---

## File Structure

```
backend/
├── src/
│   ├── training/                    # NEW: Training pipeline
│   │   ├── parsers/
│   │   │   └── svg_parser.py        # Parse SVG annotations
│   │   ├── converters/
│   │   │   └── yolo_converter.py    # Convert to YOLO format
│   │   ├── configs/
│   │   │   └── yolo_config.yaml     # Training configuration
│   │   ├── data_split.py            # Train/val/test split
│   │   ├── train_yolo.py            # Training script
│   │   ├── augmentation.py          # Data augmentation
│   │   ├── evaluate.py              # Model evaluation
│   │   └── validate.py              # Validation script
│   ├── sagemaker/
│   │   ├── detector/
│   │   │   ├── opencv_detector.py   # OLD: Keep for comparison
│   │   │   └── yolo_detector.py     # NEW: YOLO detector
│   │   ├── Dockerfile               # UPDATED: Add PyTorch
│   │   ├── requirements.txt         # UPDATED: Add dependencies
│   │   └── lambda_handler.py        # UPDATED: Use YOLO
│   └── models/                      # NEW: Store trained models
│       └── best.pt                  # Best YOLO weights

data/
├── archive/cubicasa5k/              # Original dataset
├── processed/                       # NEW: Processed dataset
│   ├── images/
│   │   ├── train/
│   │   ├── val/
│   │   └── test/
│   ├── labels/
│   │   ├── train/
│   │   ├── val/
│   │   └── test/
│   └── dataset.yaml                 # YOLO dataset config
└── visualizations/                  # NEW: Training visualizations
```

---

## Training Commands

```bash
# 1. Preprocess dataset
python backend/src/training/parsers/svg_parser.py \
  --input data/archive/cubicasa5k \
  --output data/processed/annotations.json

# 2. Convert to YOLO format
python backend/src/training/converters/yolo_converter.py \
  --annotations data/processed/annotations.json \
  --images data/archive/cubicasa5k \
  --output data/processed

# 3. Split dataset
python backend/src/training/data_split.py \
  --input data/processed \
  --train-ratio 0.7 \
  --val-ratio 0.15 \
  --test-ratio 0.15

# 4. Train YOLOv8
python backend/src/training/train_yolo.py \
  --config backend/src/training/configs/yolo_config.yaml \
  --data data/processed/dataset.yaml \
  --epochs 100 \
  --batch 16 \
  --imgsz 640 \
  --device cuda

# 5. Evaluate model
python backend/src/training/evaluate.py \
  --model backend/src/models/best.pt \
  --data data/processed/dataset.yaml \
  --split test

# 6. Validate on sample images
python backend/src/training/validate.py \
  --model backend/src/models/best.pt \
  --images data/processed/images/test \
  --output data/visualizations
```

---

## Performance Comparison

### OpenCV (Current)
- **Accuracy**: ~40-60% (estimated, rule-based)
- **Inference Time**: ~100ms
- **Room Classification**: ❌ None
- **Complex Layouts**: ❌ Poor
- **Maintenance**: ❌ Manual tuning required

### YOLOv8 (Target)
- **Accuracy**: ~85-95% (expected mAP@0.5)
- **Inference Time**: ~150-200ms (YOLOv8m)
- **Room Classification**: ✅ 9 room types
- **Complex Layouts**: ✅ Excellent
- **Maintenance**: ✅ Retrainable with new data

---

## Resource Requirements

### Training
- **GPU**: NVIDIA GPU with 8GB+ VRAM (RTX 3070/A10/T4)
- **RAM**: 16GB+
- **Storage**: 50GB (dataset + models + logs)
- **Time**: 6-12 hours (100 epochs on 4,725 images)

### Lambda Deployment
- **Memory**: 3GB (for PyTorch + YOLO model)
- **Timeout**: 30 seconds (inference ~200ms + overhead)
- **Storage**: 500MB (container with PyTorch)
- **Cost**: ~$0.20 per 1,000 inferences (estimate)

---

## Risk Mitigation

### 1. Large Model Size
- **Issue**: PyTorch + YOLOv8 = ~200MB
- **Solution**: Use Lambda container images (up to 10GB)

### 2. Cold Start Latency
- **Issue**: First invocation takes 10-30s (model loading)
- **Solution**: Provisioned concurrency for production

### 3. Annotation Quality
- **Issue**: SVG annotations may have errors
- **Solution**: Manual validation of 10% sample + data cleaning

### 4. Overfitting
- **Issue**: Limited dataset diversity
- **Solution**: Strong augmentation + early stopping + cross-validation

---

## Success Metrics

| Metric | Baseline (OpenCV) | Target (YOLO) | Threshold |
|--------|-------------------|---------------|-----------|
| mAP@0.5 | N/A | 85%+ | Pass if >80% |
| Precision | ~50% | 90%+ | Pass if >85% |
| Recall | ~60% | 85%+ | Pass if >80% |
| Inference Time | ~100ms | <200ms | Pass if <300ms |
| Room Classification | 0% | 95%+ | Pass if >90% |

---

## Timeline

| Week | Phase | Deliverables |
|------|-------|-------------|
| 1 | Data Preprocessing | SVG parser, YOLO converter, data split |
| 2 | Training Pipeline | Training script, augmentation, config |
| 3 | Model Evaluation | Trained model, metrics, visualizations |
| 4 | Lambda Integration | YOLO detector, Docker update, deployment |

**Total Duration**: 4 weeks

---

## Next Steps

1. ✅ **Review this plan** - Approve architecture and timeline
2. **Set up training environment** - GPU instance with PyTorch
3. **Implement SVG parser** - Extract room annotations
4. **Convert to YOLO format** - Prepare training data
5. **Train YOLOv8 model** - Run training pipeline
6. **Evaluate and iterate** - Optimize hyperparameters
7. **Deploy to Lambda** - Update container and handler
8. **A/B test** - Compare YOLO vs OpenCV in production

---

## References

- YOLOv8 Documentation: https://docs.ultralytics.com
- CubiCasa5k Dataset: https://github.com/CubiCasa/CubiCasa5k
- PyTorch Lambda: https://aws.amazon.com/blogs/compute/pytorch-on-aws-lambda/
