"""
YOLO dataset converter for CubiCasa5k annotations.
Converts SVG room annotations to YOLO format bounding boxes.
"""

from pathlib import Path
from typing import List, Dict, Any, Tuple
import json
from PIL import Image
import shutil


class YOLOConverter:
    """
    Convert CubiCasa5k SVG annotations to YOLO format.
    """

    def __init__(self, output_dir: Path):
        """
        Initialize YOLO converter.

        Args:
            output_dir: Root directory for YOLO dataset
        """
        self.output_dir = Path(output_dir)
        self.images_dir = self.output_dir / 'images'
        self.labels_dir = self.output_dir / 'labels'

        # Create directory structure
        for split in ['train', 'val', 'test']:
            (self.images_dir / split).mkdir(parents=True, exist_ok=True)
            (self.labels_dir / split).mkdir(parents=True, exist_ok=True)

    def convert_annotation(
        self,
        rooms: List[Dict[str, Any]],
        img_width: int,
        img_height: int
    ) -> List[str]:
        """
        Convert room annotations to YOLO format strings.

        Args:
            rooms: List of room dictionaries with bbox and class_id
            img_width: Image width in pixels
            img_height: Image height in pixels

        Returns:
            List of YOLO format strings (one per room)
        """
        yolo_lines = []

        for room in rooms:
            bbox = room['bbox']
            class_id = room['class_id']

            # Convert bbox to YOLO format
            yolo_bbox = self._bbox_to_yolo(bbox, img_width, img_height)

            # YOLO format: <class_id> <x_center> <y_center> <width> <height>
            line = f"{class_id} {yolo_bbox[0]:.6f} {yolo_bbox[1]:.6f} {yolo_bbox[2]:.6f} {yolo_bbox[3]:.6f}"
            yolo_lines.append(line)

        return yolo_lines

    def _bbox_to_yolo(
        self,
        bbox: List[float],
        img_width: int,
        img_height: int
    ) -> Tuple[float, float, float, float]:
        """
        Convert bounding box to YOLO format (normalized center coordinates).

        Args:
            bbox: [x_min, y_min, x_max, y_max] in pixels
            img_width: Image width in pixels
            img_height: Image height in pixels

        Returns:
            (x_center, y_center, width, height) normalized to [0, 1]
        """
        x_min, y_min, x_max, y_max = bbox

        # Calculate center and dimensions
        x_center = (x_min + x_max) / 2
        y_center = (y_min + y_max) / 2
        width = x_max - x_min
        height = y_max - y_min

        # Normalize to [0, 1]
        x_center_norm = x_center / img_width
        y_center_norm = y_center / img_height
        width_norm = width / img_width
        height_norm = height / img_height

        # Clamp to [0, 1] range
        x_center_norm = max(0, min(1, x_center_norm))
        y_center_norm = max(0, min(1, y_center_norm))
        width_norm = max(0, min(1, width_norm))
        height_norm = max(0, min(1, height_norm))

        return (x_center_norm, y_center_norm, width_norm, height_norm)

    def process_sample(
        self,
        image_path: Path,
        annotation_data: Dict[str, Any],
        split: str = 'train'
    ) -> bool:
        """
        Process a single sample and save to YOLO format.

        Args:
            image_path: Path to the source image
            annotation_data: Parsed annotation data from SVGParser
            split: Dataset split ('train', 'val', 'test')

        Returns:
            True if successful, False otherwise
        """
        try:
            # Get image dimensions
            with Image.open(image_path) as img:
                img_width, img_height = img.size

            # Check if SVG dimensions match image dimensions
            svg_width = annotation_data['svg_width']
            svg_height = annotation_data['svg_height']

            # Scale bounding boxes if SVG and image dimensions differ
            rooms = annotation_data['rooms']
            if svg_width != img_width or svg_height != img_height:
                rooms = self._scale_annotations(
                    rooms,
                    svg_width, svg_height,
                    img_width, img_height
                )

            # Convert to YOLO format
            yolo_lines = self.convert_annotation(rooms, img_width, img_height)

            # Skip samples with no rooms
            if not yolo_lines:
                print(f"Warning: No rooms found in {annotation_data['image_id']}")
                return False

            # Generate output paths
            image_id = annotation_data['image_id']
            output_image_path = self.images_dir / split / f"{image_id}.png"
            output_label_path = self.labels_dir / split / f"{image_id}.txt"

            # Copy image
            shutil.copy2(image_path, output_image_path)

            # Write YOLO labels
            with open(output_label_path, 'w') as f:
                f.write('\n'.join(yolo_lines))

            return True

        except Exception as e:
            print(f"Error processing {annotation_data.get('image_id', 'unknown')}: {e}")
            return False

    def _scale_annotations(
        self,
        rooms: List[Dict[str, Any]],
        svg_width: float,
        svg_height: float,
        img_width: int,
        img_height: int
    ) -> List[Dict[str, Any]]:
        """
        Scale bounding boxes from SVG coordinates to image coordinates.

        Args:
            rooms: List of room annotations
            svg_width: SVG viewBox width
            svg_height: SVG viewBox height
            img_width: Image width in pixels
            img_height: Image height in pixels

        Returns:
            Rooms with scaled bounding boxes
        """
        scale_x = img_width / svg_width
        scale_y = img_height / svg_height

        scaled_rooms = []
        for room in rooms:
            room_copy = room.copy()
            bbox = room['bbox']

            # Scale bounding box
            scaled_bbox = [
                bbox[0] * scale_x,
                bbox[1] * scale_y,
                bbox[2] * scale_x,
                bbox[3] * scale_y
            ]
            room_copy['bbox'] = scaled_bbox
            scaled_rooms.append(room_copy)

        return scaled_rooms

    def create_dataset_yaml(
        self,
        class_names: List[str],
        num_classes: int
    ) -> None:
        """
        Create dataset.yaml file for YOLO training.

        Args:
            class_names: List of class names in order
            num_classes: Number of classes
        """
        yaml_path = self.output_dir / 'dataset.yaml'

        # Use relative paths
        yaml_content = f"""# CubiCasa5k Room Detection Dataset
path: {self.output_dir.absolute()}
train: images/train
val: images/val
test: images/test

# Classes
nc: {num_classes}
names: {class_names}
"""

        with open(yaml_path, 'w') as f:
            f.write(yaml_content)

        print(f"Created dataset.yaml at {yaml_path}")

    def get_statistics(self) -> Dict[str, Any]:
        """
        Get dataset statistics.

        Returns:
            Dictionary with dataset statistics
        """
        stats = {}

        for split in ['train', 'val', 'test']:
            images_path = self.images_dir / split
            labels_path = self.labels_dir / split

            num_images = len(list(images_path.glob('*.png')))
            num_labels = len(list(labels_path.glob('*.txt')))

            # Count total annotations
            total_annotations = 0
            class_counts = {}

            for label_file in labels_path.glob('*.txt'):
                with open(label_file) as f:
                    lines = f.readlines()
                    total_annotations += len(lines)

                    # Count classes
                    for line in lines:
                        class_id = int(line.split()[0])
                        class_counts[class_id] = class_counts.get(class_id, 0) + 1

            stats[split] = {
                'num_images': num_images,
                'num_labels': num_labels,
                'total_annotations': total_annotations,
                'class_distribution': class_counts
            }

        return stats


def main():
    """Test YOLO converter."""
    import sys
    sys.path.append(str(Path(__file__).parent.parent))
    from parsers.svg_parser import SVGParser

    if len(sys.argv) < 4:
        print("Usage: python yolo_converter.py <image_path> <svg_path> <output_dir>")
        sys.exit(1)

    image_path = Path(sys.argv[1])
    svg_path = Path(sys.argv[2])
    output_dir = Path(sys.argv[3])

    # Parse SVG
    parser = SVGParser()
    annotation_data = parser.parse_svg_file(svg_path)

    # Convert to YOLO
    converter = YOLOConverter(output_dir)
    success = converter.process_sample(image_path, annotation_data, split='test')

    if success:
        print(f"\n✅ Successfully converted sample to YOLO format")
        print(f"   Image: {output_dir}/images/test/{annotation_data['image_id']}.png")
        print(f"   Label: {output_dir}/labels/test/{annotation_data['image_id']}.txt")
    else:
        print(f"\n❌ Failed to convert sample")


if __name__ == '__main__':
    main()
