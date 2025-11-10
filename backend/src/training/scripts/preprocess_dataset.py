"""
Preprocess CubiCasa5k dataset for YOLO training.
Converts SVG annotations to YOLO format and splits into train/val/test.
"""

import sys
from pathlib import Path
import argparse
import random
import json
from typing import List, Tuple
from tqdm import tqdm

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from parsers.svg_parser import SVGParser
from converters.yolo_converter import YOLOConverter


class DatasetPreprocessor:
    """
    Preprocess CubiCasa5k dataset for YOLO training.
    """

    CLASS_NAMES = [
        'Bedroom',      # 0
        'LivingRoom',   # 1
        'Kitchen',      # 2
        'Bathroom',     # 3
        'Dining',       # 4
        'Entry',        # 5
        'Closet',       # 6
        'Utility',      # 7
        'Outdoor',      # 8
        'Other'         # 9
    ]

    def __init__(
        self,
        input_dirs: List[Path],
        output_dir: Path,
        train_ratio: float = 0.7,
        val_ratio: float = 0.15,
        test_ratio: float = 0.15,
        use_scaled: bool = True,
        seed: int = 42
    ):
        """
        Initialize dataset preprocessor.

        Args:
            input_dirs: List of input directories (high_quality, high_quality_architectural)
            output_dir: Output directory for YOLO dataset
            train_ratio: Ratio for training set (default: 0.7)
            val_ratio: Ratio for validation set (default: 0.15)
            test_ratio: Ratio for test set (default: 0.15)
            use_scaled: Use scaled images instead of original (default: True)
            seed: Random seed for reproducibility
        """
        self.input_dirs = [Path(d) for d in input_dirs]
        self.output_dir = Path(output_dir)
        self.train_ratio = train_ratio
        self.val_ratio = val_ratio
        self.test_ratio = test_ratio
        self.use_scaled = use_scaled
        self.seed = seed

        # Initialize parser and converter
        self.parser = SVGParser()
        self.converter = YOLOConverter(output_dir)

        # Set random seed
        random.seed(seed)

    def collect_samples(self) -> List[Tuple[Path, Path]]:
        """
        Collect all samples from input directories.

        Returns:
            List of (image_path, svg_path) tuples
        """
        samples = []

        for input_dir in self.input_dirs:
            if not input_dir.exists():
                print(f"Warning: Directory not found: {input_dir}")
                continue

            # Find all sample directories
            for sample_dir in input_dir.iterdir():
                if not sample_dir.is_dir():
                    continue

                # Look for SVG and image files
                svg_path = sample_dir / 'model.svg'
                if not svg_path.exists():
                    continue

                # Choose image (scaled or original)
                if self.use_scaled:
                    image_path = sample_dir / 'F1_scaled.png'
                    if not image_path.exists():
                        image_path = sample_dir / 'F1_original.png'
                else:
                    image_path = sample_dir / 'F1_original.png'

                if not image_path.exists():
                    print(f"Warning: No image found in {sample_dir}")
                    continue

                samples.append((image_path, svg_path))

        return samples

    def split_dataset(
        self,
        samples: List[Tuple[Path, Path]]
    ) -> Tuple[List, List, List]:
        """
        Split samples into train/val/test sets.

        Args:
            samples: List of (image_path, svg_path) tuples

        Returns:
            Tuple of (train_samples, val_samples, test_samples)
        """
        # Shuffle samples
        random.shuffle(samples)

        total = len(samples)
        train_end = int(total * self.train_ratio)
        val_end = train_end + int(total * self.val_ratio)

        train_samples = samples[:train_end]
        val_samples = samples[train_end:val_end]
        test_samples = samples[val_end:]

        print(f"\nDataset split:")
        print(f"  Training:   {len(train_samples)} samples ({len(train_samples)/total*100:.1f}%)")
        print(f"  Validation: {len(val_samples)} samples ({len(val_samples)/total*100:.1f}%)")
        print(f"  Test:       {len(test_samples)} samples ({len(test_samples)/total*100:.1f}%)")

        return train_samples, val_samples, test_samples

    def process_samples(
        self,
        samples: List[Tuple[Path, Path]],
        split: str
    ) -> Tuple[int, int]:
        """
        Process samples for a given split.

        Args:
            samples: List of (image_path, svg_path) tuples
            split: Dataset split ('train', 'val', 'test')

        Returns:
            Tuple of (successful, failed) counts
        """
        successful = 0
        failed = 0

        for image_path, svg_path in tqdm(samples, desc=f"Processing {split}"):
            try:
                # Parse SVG annotations
                annotation_data = self.parser.parse_svg_file(svg_path)

                # Convert and save to YOLO format
                success = self.converter.process_sample(
                    image_path,
                    annotation_data,
                    split=split
                )

                if success:
                    successful += 1
                else:
                    failed += 1

            except Exception as e:
                print(f"\nError processing {image_path.parent.name}: {e}")
                failed += 1

        return successful, failed

    def process_all(self) -> None:
        """
        Process entire dataset: collect, split, and convert to YOLO format.
        """
        print("="*60)
        print("CubiCasa5k Dataset Preprocessing")
        print("="*60)

        # Collect samples
        print("\nCollecting samples...")
        samples = self.collect_samples()
        print(f"Found {len(samples)} samples")

        if not samples:
            print("Error: No samples found!")
            return

        # Split dataset
        train_samples, val_samples, test_samples = self.split_dataset(samples)

        # Process each split
        print("\n" + "="*60)
        print("Converting to YOLO format...")
        print("="*60)

        train_success, train_failed = self.process_samples(train_samples, 'train')
        val_success, val_failed = self.process_samples(val_samples, 'val')
        test_success, test_failed = self.process_samples(test_samples, 'test')

        # Create dataset.yaml
        self.converter.create_dataset_yaml(
            class_names=self.CLASS_NAMES,
            num_classes=len(self.CLASS_NAMES)
        )

        # Get and display statistics
        print("\n" + "="*60)
        print("Dataset Statistics")
        print("="*60)
        stats = self.converter.get_statistics()

        for split, split_stats in stats.items():
            print(f"\n{split.upper()}:")
            print(f"  Images: {split_stats['num_images']}")
            print(f"  Labels: {split_stats['num_labels']}")
            print(f"  Total annotations: {split_stats['total_annotations']}")

            if split_stats['total_annotations'] > 0:
                print(f"  Avg annotations/image: {split_stats['total_annotations']/split_stats['num_images']:.1f}")

            print(f"  Class distribution:")
            for class_id, count in sorted(split_stats['class_distribution'].items()):
                class_name = self.CLASS_NAMES[class_id]
                percentage = count / split_stats['total_annotations'] * 100
                print(f"    {class_id}: {class_name:12s} - {count:4d} ({percentage:5.1f}%)")

        # Summary
        total_success = train_success + val_success + test_success
        total_failed = train_failed + val_failed + test_failed
        total_processed = total_success + total_failed

        print("\n" + "="*60)
        print("Processing Summary")
        print("="*60)
        print(f"Total samples processed: {total_processed}")
        print(f"  Successful: {total_success} ({total_success/total_processed*100:.1f}%)")
        print(f"  Failed:     {total_failed} ({total_failed/total_processed*100:.1f}%)")
        print(f"\nDataset saved to: {self.output_dir.absolute()}")
        print(f"dataset.yaml created at: {self.output_dir / 'dataset.yaml'}")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Preprocess CubiCasa5k dataset for YOLO training'
    )
    parser.add_argument(
        '--input',
        type=str,
        nargs='+',
        required=True,
        help='Input directories (e.g., data/archive/cubicasa5k/cubicasa5k/high_quality)'
    )
    parser.add_argument(
        '--output',
        type=str,
        required=True,
        help='Output directory for YOLO dataset'
    )
    parser.add_argument(
        '--train-ratio',
        type=float,
        default=0.7,
        help='Training set ratio (default: 0.7)'
    )
    parser.add_argument(
        '--val-ratio',
        type=float,
        default=0.15,
        help='Validation set ratio (default: 0.15)'
    )
    parser.add_argument(
        '--test-ratio',
        type=float,
        default=0.15,
        help='Test set ratio (default: 0.15)'
    )
    parser.add_argument(
        '--use-original',
        action='store_true',
        help='Use original images instead of scaled'
    )
    parser.add_argument(
        '--seed',
        type=int,
        default=42,
        help='Random seed (default: 42)'
    )

    args = parser.parse_args()

    # Validate ratios
    total_ratio = args.train_ratio + args.val_ratio + args.test_ratio
    if abs(total_ratio - 1.0) > 0.01:
        print(f"Error: Ratios must sum to 1.0 (got {total_ratio})")
        sys.exit(1)

    # Initialize and run preprocessor
    preprocessor = DatasetPreprocessor(
        input_dirs=args.input,
        output_dir=args.output,
        train_ratio=args.train_ratio,
        val_ratio=args.val_ratio,
        test_ratio=args.test_ratio,
        use_scaled=not args.use_original,
        seed=args.seed
    )

    preprocessor.process_all()


if __name__ == '__main__':
    main()
