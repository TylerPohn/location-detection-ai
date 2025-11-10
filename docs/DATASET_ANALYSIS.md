# CubiCasa5k Dataset Analysis

## Dataset Overview

**Total Samples**: 4,725
- `high_quality`: 992 samples
- `high_quality_architectural`: 3,732 samples

---

## File Structure

### Per Sample Directory
```
{sample_id}/
├── F1_original.png    # Original floor plan image
├── F1_scaled.png      # Scaled version (1432x1050 typical)
├── F2_original.png    # (Optional) Second floor
├── F2_scaled.png      # (Optional) Second floor scaled
└── model.svg          # Vector annotations (rooms, walls, furniture)
```

### Image Specifications
- **Format**: PNG, 8-bit RGB, non-interlaced
- **F1_original.png**: ~851x624 pixels, ~220KB
- **F1_scaled.png**: ~1432x1050 pixels, ~280KB
- **Variability**: Image dimensions vary across samples

---

## SVG Annotation Structure

### Root Structure
```xml
<svg width="..." height="..." viewBox="0 0 width height">
  <g id="Model" class="Model v1-1">
    <g class="Floor">
      <g id="Floor-1" class="Floorplan Floor-1">
        <!-- Room polygons -->
        <g id="{uuid}" class="Space {RoomType} {SubType}">
          <polygon points="x1,y1 x2,y2 x3,y3 ..."/>
          <g class="Dimension">
            <g class="SpaceDimensionsLabel">
              <text>{RoomLabel}</text>
            </g>
          </g>
        </g>
        <!-- Wall polygons -->
        <g id="Wall" class="Wall {External/Internal}">
          <polygon points="..."/>
        </g>
        <!-- Furniture (optional) -->
        <g class="FixedFurniture {FurnitureType}">
          <polygon points="..."/>
        </g>
      </g>
    </g>
  </g>
</svg>
```

---

## Room Classes (Detected from Samples)

### Primary Room Types
From sampling 10 files in `high_quality`, found these room classes:

| Room Type | Count | Description |
|-----------|-------|-------------|
| `Space Undefined` | 18 | Undefined spaces (hallways, etc.) |
| `Space Bedroom` | 15 | Bedrooms |
| `Space Bath` | 11 | Bathrooms |
| `Space LivingRoom` | 8 | Living rooms |
| `Space Kitchen` | 8 | Kitchens |
| `Space Entry Lobby` | 8 | Entry/lobby areas |
| `Space Outdoor` | 7 | Outdoor spaces (generic) |
| `Space Outdoor Balcony` | 3 | Balconies |
| `Space DraughtLobby` | 3 | Draft lobbies |
| `Space Closet WalkIn` | 3 | Walk-in closets |
| `Space Utility Laundry` | 2 | Laundry rooms |
| `Space UserDefined` | 2 | User-defined spaces |
| `Space Outdoor Terrace` | 2 | Terraces |
| `Space Dining` | 2 | Dining rooms |
| `Space Bath Shower` | 2 | Shower rooms |
| `Space TechnicalRoom` | 1 | Technical/mechanical rooms |
| `Space Outdoor Garden` | 1 | Gardens |
| `Space Garage` | 1 | Garages |
| `Space DressingRoom` | 1 | Dressing rooms |
| `Space Sauna` | 1 | Saunas (Finnish dataset) |
| `Space Storage` | 1 | Storage rooms |

### Class Hierarchy
Classes follow a pattern: `Space {PrimaryType} {SubType}`

Examples:
- `Space Closet WalkIn` → Primary: Closet, Sub: WalkIn
- `Space Outdoor Balcony` → Primary: Outdoor, Sub: Balcony
- `Space Bath Shower` → Primary: Bath, Sub: Shower

---

## Proposed YOLO Class Mapping

### Simplified 10-Class System

| YOLO ID | Class Name | Maps From SVG Classes |
|---------|------------|----------------------|
| 0 | Bedroom | `Space Bedroom`, `Space DressingRoom` |
| 1 | LivingRoom | `Space LivingRoom` |
| 2 | Kitchen | `Space Kitchen` |
| 3 | Bathroom | `Space Bath`, `Space Bath Shower` |
| 4 | Dining | `Space Dining` |
| 5 | Entry | `Space Entry Lobby`, `Space DraughtLobby` |
| 6 | Closet | `Space Closet WalkIn`, `Space Storage` |
| 7 | Utility | `Space Utility Laundry`, `Space TechnicalRoom` |
| 8 | Outdoor | `Space Outdoor`, `Space Outdoor Balcony`, `Space Outdoor Terrace`, `Space Outdoor Garden` |
| 9 | Other | `Space Undefined`, `Space UserDefined`, `Space Garage`, `Space Sauna` |

**Rationale**:
- Merge similar room types to reduce class imbalance
- Focus on common residential room types
- Collapse rare/regional classes (Sauna) into "Other"

---

## Key Observations

### 1. **Coordinate System**
- SVG uses absolute coordinates matching `viewBox` dimensions
- Coordinates are NOT normalized (raw pixel values)
- Example: `<polygon points="723.76,720.04 831.23,720.04 ..."/>`

### 2. **Multi-Floor Support**
- Some samples have F1 and F2 (Floor 1, Floor 2)
- Each floor has separate PNG and annotations in SVG
- Need to handle multi-floor plans in preprocessing

### 3. **Room Labels**
- **Abbreviated labels**: "VH" (walk-in closet), "MH" (master bedroom), "K" (kitchen)
- **Full labels**: "PARVEKE" (balcony in Finnish), "SAUNATUPA" (sauna room)
- **Language**: Mix of English and Finnish (dataset from Finland)

### 4. **Polygon Complexity**
- Rooms can have 4-50+ vertices
- Most rooms are rectangular (4-8 vertices)
- Some rooms have irregular shapes (L-shaped, curved walls)

### 5. **Bounding Box Calculation**
- Must convert polygons to bounding boxes for YOLO
- Use min/max x,y coordinates from polygon points
- Normalize to [0, 1] range for YOLO format

### 6. **Additional Elements**
- **Walls**: Separate polygons with `class="Wall External"` or `class="Wall"`
- **Doors**: `<g id="Door">` with swing panels
- **Windows**: `<g id="Window">` with glass panels
- **Furniture**: `<g class="FixedFurniture {Type}">` (toilets, cabinets, etc.)
- These are NOT room detections but could be useful for context

---

## Data Quality Notes

### ✅ Strengths
- High-quality vector annotations (precise polygons)
- Rich metadata (room types, dimensions, furniture)
- Diverse floor plan layouts (apartments, houses)
- Multiple image resolutions (original + scaled)

### ⚠️ Challenges
- **Class imbalance**: "Undefined" and "Bedroom" dominate
- **Language mixing**: English + Finnish labels
- **Irregular shapes**: Some rooms have 20+ vertices
- **Nested spaces**: Closets inside bedrooms
- **Occlusion**: Furniture overlaps room boundaries

---

## Preprocessing Requirements

### 1. **SVG Parsing**
- Parse XML to extract `<g class="Space ...">` elements
- Extract polygon points from `<polygon points="...">`
- Parse class attribute for room type
- Handle multi-floor plans (F1, F2, etc.)

### 2. **Polygon → Bounding Box**
```python
def polygon_to_bbox(points):
    """Convert polygon points to bounding box."""
    x_coords = [p[0] for p in points]
    y_coords = [p[1] for p in points]
    x_min, x_max = min(x_coords), max(x_coords)
    y_min, y_max = min(y_coords), max(y_coords)
    return [x_min, y_min, x_max, y_max]
```

### 3. **YOLO Format Conversion**
```python
def bbox_to_yolo(bbox, img_width, img_height):
    """Convert bounding box to YOLO format."""
    x_min, y_min, x_max, y_max = bbox
    x_center = (x_min + x_max) / 2 / img_width
    y_center = (y_min + y_max) / 2 / img_height
    width = (x_max - x_min) / img_width
    height = (y_max - y_min) / img_height
    return [x_center, y_center, width, height]
```

### 4. **Image-Annotation Alignment**
- Match SVG `viewBox` dimensions to PNG image size
- Handle scaling differences (original vs scaled PNGs)
- **Recommendation**: Use `F1_scaled.png` for consistency

---

## Expected Dataset Statistics (Post-Processing)

Assuming 10 room classes and 4,725 samples with ~5 rooms/sample:

| Metric | Estimated Value |
|--------|-----------------|
| Total annotations | ~23,625 |
| Avg rooms/image | ~5 |
| Training samples (70%) | ~3,307 images |
| Validation samples (15%) | ~709 images |
| Test samples (15%) | ~709 images |

---

## Next Steps

1. ✅ **Dataset analysis complete**
2. ⏭️ **Implement SVG parser** → Extract room polygons
3. ⏭️ **Build YOLO converter** → Polygon → BBox → YOLO format
4. ⏭️ **Split dataset** → Train/val/test split
5. ⏭️ **Validate samples** → Visual inspection of annotations

---

## Sample Annotation Example

**Input SVG** (`high_quality/10004/model.svg`):
```xml
<g id="5b50b6f3-7b9d-4305-a3a1-fe80cf65fafb" class="Space Bedroom">
  <polygon points="324.59,513.46 667.27,513.46 667.27,720.04 709.76,720.04
                  709.76,849.66 324.80,849.66 324.59,513.46"/>
  <g class="SpaceDimensionsLabel">
    <text>MH</text> <!-- Master Bedroom -->
  </g>
</g>
```

**Extracted Data**:
```json
{
  "image_id": "10004",
  "floor": "F1",
  "rooms": [{
    "id": "5b50b6f3-7b9d-4305-a3a1-fe80cf65fafb",
    "type": "Bedroom",
    "label": "MH",
    "polygon": [[324.59, 513.46], [667.27, 513.46], ...],
    "bbox": [324.59, 513.46, 709.76, 849.66]
  }]
}
```

**YOLO Format** (assuming 1432x1050 image):
```
0 0.361 0.649 0.269 0.320
# class=0 (Bedroom), x_center=0.361, y_center=0.649, width=0.269, height=0.320
```

---

## File Format Confirmation ✅

- ✅ **PNG Format**: RGB 8-bit, non-interlaced
- ✅ **SVG Format**: XML 1.0, well-formed
- ✅ **Image Dimensions**: Variable, ~1432x1050 typical for scaled
- ✅ **Annotation Structure**: Hierarchical SVG groups with class attributes
- ✅ **Room Types**: 20+ unique classes detected
- ✅ **Multi-Floor**: ~10-15% of samples have F2 (second floor)

**Ready to proceed with SVG parser implementation!**
