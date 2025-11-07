"""CLI tool for testing room boundary detection."""
import argparse
import cv2
import json
import sys
from pathlib import Path
from opencv_detector import OpenCVDetector


def main():
    """Main CLI entry point."""
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

    # Print summary
    for room in rooms:
        print(f"  {room['id']}: {len(room['polygon'])} vertices, area={room['area']:.2f}, perimeter={room['perimeter']:.2f}")

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
    sys.exit(main())
