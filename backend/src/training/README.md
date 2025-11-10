# YOLO Training Pipeline for Room Detection

This directory contains the complete preprocessing pipeline to convert CubiCasa5k SVG annotations to YOLO format for training room detection models.

## ✅ Implementation Status

- [x] SVG annotation parser
- [x] YOLO format converter
- [x] Train/val/test splitting
- [x] Dataset preprocessing script
- [x] Tested on sample data (8 rooms detected correctly)

## 📁 Directory Structure

```
training/
├── parsers/
│   └── svg_parser.py          # Parse SVG annotations
├── converters/
│   └── yolo_converter.py       # Convert to YOLO format
├── scripts/
│   └── preprocess_dataset.py  # Full dataset preprocessing
├── configs/
│   └── (training configs - to be added)
├── requirements.txt            # Python dependencies
├── setup.sh                    # Environment setup script
└── README.md                   # This file
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Option 1: System-wide (requires --break-system-packages on macOS)
pip3 install --break-system-packages Pillow tqdm

# Option 2: Virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate
pip install Pillow tqdm
```

### 2. Test on Single Sample

```bash
# Test SVG parser
python3 parsers/svg_parser.py \
  data/archive/cubicasa5k/cubicasa5k/high_quality/10004/model.svg

# Test YOLO converter
python3 converters/yolo_converter.py \
  data/archive/cubicasa5k/cubicasa5k/high_quality/10004/F1_scaled.png \
  data/archive/cubicasa5k/cubicasa5k/high_quality/10004/model.svg \
  data/processed_test
```

### 3. Preprocess Full Dataset

```bash
python3 scripts/preprocess_dataset.py \
  --input data/archive/cubicasa5k/cubicasa5k/high_quality \
          data/archive/cubicasa5k/cubicasa5k/high_quality_architectural \
  --output data/processed \
  --train-ratio 0.7 \
  --val-ratio 0.15 \
  --test-ratio 0.15
```

**Output**:
- `data/processed/images/train/` - Training images
- `data/processed/images/val/` - Validation images
- `data/processed/images/test/` - Test images
- `data/processed/labels/train/` - Training labels (YOLO format)
- `data/processed/labels/val/` - Validation labels
- `data/processed/labels/test/` - Test labels
- `data/processed/dataset.yaml` - YOLO dataset config

## 📊 Dataset Info

### Room Classes (10 total)

| ID | Class Name | Maps From SVG |
|----|-----------|---------------|
| 0  | Bedroom   | Bedroom, DressingRoom |
| 1  | LivingRoom| LivingRoom |
| 2  | Kitchen   | Kitchen |
| 3  | Bathroom  | Bath, Bath Shower |
| 4  | Dining    | Dining |
| 5  | Entry     | Entry Lobby, DraughtLobby |
| 6  | Closet    | Closet WalkIn, Storage |
| 7  | Utility   | Utility Laundry, TechnicalRoom |
| 8  | Outdoor   | Outdoor, Outdoor Balcony, Outdoor Terrace |
| 9  | Other     | Undefined, UserDefined, Garage, Sauna |

### Dataset Statistics

- **Total samples**: 4,725 (992 high_quality + 3,732 high_quality_architectural)
- **Default split**: 70% train / 15% val / 15% test
- **Expected annotations**: ~23,625 (avg 5 rooms/image)

## 🔧 Advanced Usage

### Custom Split Ratios

```bash
python3 scripts/preprocess_dataset.py \
  --input data/archive/cubicasa5k/cubicasa5k/high_quality \
  --output data/processed \
  --train-ratio 0.8 \
  --val-ratio 0.1 \
  --test-ratio 0.1
```

### Use Original Images (not scaled)

```bash
python3 scripts/preprocess_dataset.py \
  --input data/archive/cubicasa5k/cubicasa5k/high_quality \
  --output data/processed \
  --use-original
```

### Custom Random Seed

```bash
python3 scripts/preprocess_dataset.py \
  --input data/archive/cubicasa5k/cubicasa5k/high_quality \
  --output data/processed \
  --seed 12345
```

## 📝 YOLO Format

Each `.txt` label file contains one line per room:
```
<class_id> <x_center> <y_center> <width> <height>
```

All coordinates are normalized to [0, 1] range.

**Example** (`10004.txt`):
```
6 0.639524 0.896295 0.088399 0.148025  # Closet
0 0.425399 0.778339 0.316819 0.383939  # Bedroom
8 0.168741 0.398151 0.153347 0.497191  # Outdoor (Balcony)
5 0.671262 0.696332 0.218484 0.251901  # Entry
2 0.832291 0.366843 0.292645 0.407190  # Kitchen
1 0.476389 0.366820 0.419160 0.407122  # LivingRoom
9 0.691727 0.267581 0.011516 0.208643  # Other (Undefined)
9 0.885317 0.697502 0.186594 0.222152  # Other (UserDefined)
```

## 🧪 Testing

### Verify Sample Output

```bash
# Check sample conversion
cat data/processed_test/labels/test/10004.txt

# Expected: 7-8 lines of YOLO format annotations
# Format: class_id x_center y_center width height
```

### Check Image-Label Alignment

```bash
# Install yolov8 for visualization (optional)
pip install ultralytics

# Visualize annotations
from ultralytics import YOLO
import cv2

img = cv2.imread('data/processed/images/train/10004.png')
# Draw bounding boxes from labels/train/10004.txt
```

## 🐛 Troubleshooting

### Module Not Found Errors

Make sure you're running from the project root:
```bash
cd /Users/tyler/Desktop/Gauntlet/location-detection-ai
python3 backend/src/training/scripts/preprocess_dataset.py ...
```

### No Rooms Detected

- Check SVG file format (must have `<g class="Space ...">` elements)
- Verify polygon points exist in SVG
- Check parser output: `python3 parsers/svg_parser.py <svg_file>`

### Image-SVG Dimension Mismatch

The converter automatically scales bounding boxes if SVG viewBox dimensions differ from image dimensions.

## 📈 Next Steps

After preprocessing:

1. **Train YOLOv8 model**:
   ```bash
   yolo detect train data=data/processed/dataset.yaml model=yolov8m.pt epochs=100 imgsz=640
   ```

2. **Evaluate model**:
   ```bash
   yolo detect val model=runs/detect/train/weights/best.pt data=data/processed/dataset.yaml
   ```

3. **Run inference**:
   ```bash
   yolo detect predict model=runs/detect/train/weights/best.pt source=data/processed/images/test/
   ```

## 📚 References

- [CubiCasa5k Dataset](https://github.com/CubiCasa/CubiCasa5k)
- [YOLOv8 Documentation](https://docs.ultralytics.com)
- [YOLO Format Specification](https://docs.ultralytics.com/datasets/detect/)

---

**Status**: ✅ Preprocessing pipeline implemented and tested
**Last Updated**: 2025-11-09
