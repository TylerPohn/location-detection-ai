"""
Convert YOLO format to required JSON output format.
Demonstrates conformance to the API requirements.
"""

import json
from pathlib import Path
from PIL import Image

# Class mapping (as per training)
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

def yolo_to_json(image_path: str, label_path: str) -> list:
    """
    Convert YOLO format labels to required JSON output format.

    Args:
        image_path: Path to the image file
        label_path: Path to the YOLO label file

    Returns:
        List of room dictionaries in required format
    """
    # Get image dimensions
    with Image.open(image_path) as img:
        img_width, img_height = img.size

    rooms = []

    # Read YOLO labels
    with open(label_path, 'r') as f:
        for idx, line in enumerate(f):
            parts = line.strip().split()
            if len(parts) < 5:
                continue

            class_id = int(parts[0])
            x_center = float(parts[1])
            y_center = float(parts[2])
            width = float(parts[3])
            height = float(parts[4])

            # Convert from YOLO format (normalized center) to bounding box
            x_min = (x_center - width / 2) * img_width
            y_min = (y_center - height / 2) * img_height
            x_max = (x_center + width / 2) * img_width
            y_max = (y_center + height / 2) * img_height

            # Normalize to 0-1000 range (as required)
            x_min_norm = int((x_min / img_width) * 1000)
            y_min_norm = int((y_min / img_height) * 1000)
            x_max_norm = int((x_max / img_width) * 1000)
            y_max_norm = int((y_max / img_height) * 1000)

            # Build room object in required format
            room = {
                "id": f"room_{str(idx+1).zfill(3)}",
                "bounding_box": [x_min_norm, y_min_norm, x_max_norm, y_max_norm],
                "name_hint": CLASS_NAMES.get(class_id, "Unknown")
            }

            rooms.append(room)

    return rooms


if __name__ == '__main__':
    import sys

    if len(sys.argv) < 3:
        print("Usage: python convert_yolo_to_json.py <image_path> <label_path>")
        sys.exit(1)

    image_path = sys.argv[1]
    label_path = sys.argv[2]

    rooms = yolo_to_json(image_path, label_path)

    print(json.dumps(rooms, indent=2))
