#!/usr/bin/env python3
"""
Annotation Generator for Floor Plans
=====================================
Processes floor plan images with OpenCV detector and generates training annotations.

Usage:
    python generate_annotations.py --input-dir <path> --output-dir <path> --limit 5
"""

import os
import sys
import json
import argparse
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any
import cv2
import numpy as np

# Add parent directory to path to import detector
sys.path.insert(0, str(Path(__file__).parent.parent / 'src' / 'sagemaker'))
from detector.opencv_detector import OpenCVDetector


class AnnotationGenerator:
    """Generate training annotations from floor plan images."""

    def __init__(self, output_dir: str):
        """
        Initialize generator.

        Args:
            output_dir: Directory to save annotations
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Create subdirectories
        (self.output_dir / 'individual').mkdir(exist_ok=True)
        (self.output_dir / 'visualizations').mkdir(exist_ok=True)

        self.detector = OpenCVDetector()
        self.annotations = []
        self.stats = {
            'total_images': 0,
            'total_rooms': 0,
            'failed_images': 0,
            'room_counts': {}
        }

    def process_image(self, image_path: Path, relative_path: str) -> Dict[str, Any]:
        """
        Process single image and generate annotation.

        Args:
            image_path: Full path to image
            relative_path: Relative path from dataset root

        Returns:
            Annotation dictionary
        """
        try:
            # Load image
            image = cv2.imread(str(image_path))
            if image is None:
                raise ValueError(f"Failed to load image: {image_path}")

            height, width = image.shape[:2]

            # Detect rooms
            rooms = self.detector.detect_rooms(image)

            # Convert to API format
            formatted_rooms = []
            for room in rooms:
                # Convert vertices to polygon format
                polygon = [[v['x'], v['y']] for v in room['vertices']]

                # Calculate perimeter
                perimeter = self._calculate_perimeter(polygon)

                formatted_rooms.append({
                    'id': room['id'] + 1,  # 1-indexed for annotations
                    'polygon': polygon,
                    'area': room['area'],
                    'perimeter': perimeter,
                    'bounding_box': {
                        'x_min': room['bounding_box']['x'],
                        'y_min': room['bounding_box']['y'],
                        'x_max': room['bounding_box']['x'] + room['bounding_box']['width'],
                        'y_max': room['bounding_box']['y'] + room['bounding_box']['height']
                    },
                    'confidence': room['confidence'],
                    'room_type': 'unknown',  # To be labeled manually
                    'lines': []  # Can be added later
                })

            # Create annotation
            annotation = {
                'image_id': image_path.stem,
                'image_path': relative_path,
                'image_shape': {
                    'width': width,
                    'height': height
                },
                'room_count': len(formatted_rooms),
                'rooms': formatted_rooms,
                'metadata': {
                    'annotated_by': 'opencv_detector',
                    'annotation_date': datetime.utcnow().isoformat() + 'Z',
                    'verified': False,
                    'detector_config': {
                        'min_area': self.detector.min_area,
                        'max_area': self.detector.max_area,
                        'epsilon_factor': self.detector.epsilon_factor
                    }
                }
            }

            # Update statistics
            self.stats['total_images'] += 1
            self.stats['total_rooms'] += len(formatted_rooms)
            count_key = str(len(formatted_rooms))
            self.stats['room_counts'][count_key] = self.stats['room_counts'].get(count_key, 0) + 1

            # Save individual annotation
            self._save_individual_annotation(annotation)

            # Generate visualization
            self._generate_visualization(image, formatted_rooms, image_path.stem)

            return annotation

        except Exception as e:
            print(f"Error processing {image_path}: {e}")
            self.stats['failed_images'] += 1
            return None

    def _calculate_perimeter(self, polygon: List[List[int]]) -> float:
        """Calculate polygon perimeter."""
        if len(polygon) < 2:
            return 0.0

        perimeter = 0.0
        for i in range(len(polygon)):
            p1 = polygon[i]
            p2 = polygon[(i + 1) % len(polygon)]
            dx = p2[0] - p1[0]
            dy = p2[1] - p1[1]
            perimeter += np.sqrt(dx*dx + dy*dy)

        return float(perimeter)

    def _save_individual_annotation(self, annotation: Dict[str, Any]):
        """Save individual annotation to JSON file."""
        output_path = self.output_dir / 'individual' / f"{annotation['image_id']}.json"
        with open(output_path, 'w') as f:
            json.dump(annotation, f, indent=2)

    def _generate_visualization(self, image: np.ndarray, rooms: List[Dict], image_id: str):
        """Generate visualization with detected rooms overlaid."""
        vis = image.copy()

        # Draw each room
        for room in rooms:
            # Convert polygon to numpy array
            polygon = np.array(room['polygon'], dtype=np.int32)

            # Draw filled polygon with transparency
            overlay = vis.copy()
            color = tuple(np.random.randint(0, 255, 3).tolist())
            cv2.fillPoly(overlay, [polygon], color)
            cv2.addWeighted(overlay, 0.3, vis, 0.7, 0, vis)

            # Draw polygon outline
            cv2.polylines(vis, [polygon], True, color, 2)

            # Draw room ID
            center = polygon.mean(axis=0).astype(int)
            cv2.putText(
                vis,
                f"R{room['id']}",
                tuple(center),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                (255, 255, 255),
                2
            )
            cv2.putText(
                vis,
                f"R{room['id']}",
                tuple(center),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                (0, 0, 0),
                1
            )

        # Save visualization
        output_path = self.output_dir / 'visualizations' / f"{image_id}.png"
        cv2.imwrite(str(output_path), vis)

    def process_directory(self, input_dir: Path, limit: int = None):
        """
        Process all images in directory.

        Args:
            input_dir: Input directory containing images
            limit: Maximum number of images to process (None for all)
        """
        print(f"Scanning directory: {input_dir}")

        # Find all PNG/JPG files
        image_files = []
        for ext in ['*.png', '*.jpg', '*.jpeg']:
            image_files.extend(input_dir.rglob(ext))

        total_found = len(image_files)
        to_process = image_files[:limit] if limit else image_files

        print(f"Found {total_found} images, processing {len(to_process)}...")

        for idx, image_path in enumerate(to_process, 1):
            print(f"[{idx}/{len(to_process)}] Processing: {image_path.name}")

            # Get relative path from input directory
            relative_path = str(image_path.relative_to(input_dir))

            annotation = self.process_image(image_path, relative_path)
            if annotation:
                self.annotations.append(annotation)

    def save_dataset_file(self):
        """Save combined dataset annotation file."""
        dataset = {
            'version': '1.0',
            'dataset_info': {
                'name': 'Single Family Floor Plans',
                'created_date': datetime.utcnow().strftime('%Y-%m-%d'),
                'annotation_method': 'semi-automated',
                'detector': 'opencv'
            },
            'categories': [
                {'id': 1, 'name': 'bedroom', 'supercategory': 'room'},
                {'id': 2, 'name': 'bathroom', 'supercategory': 'room'},
                {'id': 3, 'name': 'kitchen', 'supercategory': 'room'},
                {'id': 4, 'name': 'living_room', 'supercategory': 'room'},
                {'id': 5, 'name': 'dining_room', 'supercategory': 'room'},
                {'id': 6, 'name': 'hallway', 'supercategory': 'room'},
                {'id': 7, 'name': 'closet', 'supercategory': 'room'},
                {'id': 8, 'name': 'garage', 'supercategory': 'room'},
                {'id': 9, 'name': 'utility', 'supercategory': 'room'},
                {'id': 10, 'name': 'office', 'supercategory': 'room'},
                {'id': 11, 'name': 'unknown', 'supercategory': 'room'}
            ],
            'annotations': self.annotations,
            'statistics': {
                'total_images': self.stats['total_images'],
                'total_rooms': self.stats['total_rooms'],
                'failed_images': self.stats['failed_images'],
                'avg_rooms_per_plan': round(
                    self.stats['total_rooms'] / max(1, self.stats['total_images']), 2
                ),
                'room_count_distribution': self.stats['room_counts']
            }
        }

        output_path = self.output_dir / 'dataset_annotations.json'
        with open(output_path, 'w') as f:
            json.dump(dataset, f, indent=2)

        print(f"\nDataset annotation saved to: {output_path}")

    def print_summary(self):
        """Print processing summary."""
        print("\n" + "="*60)
        print("ANNOTATION GENERATION SUMMARY")
        print("="*60)
        print(f"Total images processed: {self.stats['total_images']}")
        print(f"Total rooms detected: {self.stats['total_rooms']}")
        print(f"Failed images: {self.stats['failed_images']}")

        if self.stats['total_images'] > 0:
            avg_rooms = self.stats['total_rooms'] / self.stats['total_images']
            print(f"Average rooms per plan: {avg_rooms:.2f}")

        print("\nRoom count distribution:")
        for count in sorted(self.stats['room_counts'].keys(), key=int):
            num_images = self.stats['room_counts'][count]
            print(f"  {count} rooms: {num_images} images")

        print(f"\nOutput directory: {self.output_dir}")
        print(f"  - Individual annotations: {self.output_dir / 'individual'}")
        print(f"  - Visualizations: {self.output_dir / 'visualizations'}")
        print(f"  - Dataset file: {self.output_dir / 'dataset_annotations.json'}")
        print("="*60)


def main():
    parser = argparse.ArgumentParser(
        description='Generate training annotations from floor plan images'
    )
    parser.add_argument(
        '--input-dir',
        required=True,
        help='Input directory containing floor plan images'
    )
    parser.add_argument(
        '--output-dir',
        required=True,
        help='Output directory for annotations'
    )
    parser.add_argument(
        '--limit',
        type=int,
        default=None,
        help='Limit number of images to process (default: all)'
    )

    args = parser.parse_args()

    input_dir = Path(args.input_dir)
    if not input_dir.exists():
        print(f"Error: Input directory does not exist: {input_dir}")
        sys.exit(1)

    # Generate annotations
    generator = AnnotationGenerator(args.output_dir)
    generator.process_directory(input_dir, limit=args.limit)
    generator.save_dataset_file()
    generator.print_summary()


if __name__ == '__main__':
    main()
