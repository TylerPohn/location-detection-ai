"""
SageMaker training script for YOLOv8 room detection model.
This script runs inside a SageMaker training container.
"""

import os
import argparse
from pathlib import Path
from ultralytics import YOLO
import boto3
import json


def parse_args():
    """Parse training arguments from SageMaker."""
    parser = argparse.ArgumentParser()

    # Model hyperparameters
    parser.add_argument('--model', type=str, default='yolov8m.pt',
                        help='YOLO model size (yolov8n.pt, yolov8s.pt, yolov8m.pt, yolov8l.pt, yolov8x.pt)')
    parser.add_argument('--epochs', type=int, default=100,
                        help='Number of training epochs')
    parser.add_argument('--imgsz', type=int, default=640,
                        help='Image size for training')
    parser.add_argument('--batch', type=int, default=16,
                        help='Batch size (-1 for auto)')
    parser.add_argument('--patience', type=int, default=20,
                        help='Early stopping patience')
    parser.add_argument('--device', type=str, default='0',
                        help='GPU device (0, 1, 2, etc. or cpu)')
    parser.add_argument('--workers', type=int, default=8,
                        help='Number of worker threads')

    # Optimization hyperparameters
    parser.add_argument('--optimizer', type=str, default='auto',
                        help='Optimizer (SGD, Adam, AdamW, auto)')
    parser.add_argument('--lr0', type=float, default=0.01,
                        help='Initial learning rate')
    parser.add_argument('--lrf', type=float, default=0.01,
                        help='Final learning rate (lr0 * lrf)')
    parser.add_argument('--momentum', type=float, default=0.937,
                        help='SGD momentum/Adam beta1')
    parser.add_argument('--weight_decay', type=float, default=0.0005,
                        help='Optimizer weight decay')

    # Augmentation hyperparameters
    parser.add_argument('--hsv_h', type=float, default=0.015,
                        help='HSV hue augmentation')
    parser.add_argument('--hsv_s', type=float, default=0.7,
                        help='HSV saturation augmentation')
    parser.add_argument('--hsv_v', type=float, default=0.4,
                        help='HSV value augmentation')
    parser.add_argument('--degrees', type=float, default=0.0,
                        help='Rotation augmentation (degrees)')
    parser.add_argument('--translate', type=float, default=0.1,
                        help='Translation augmentation')
    parser.add_argument('--scale', type=float, default=0.5,
                        help='Scale augmentation')
    parser.add_argument('--fliplr', type=float, default=0.5,
                        help='Horizontal flip probability')
    parser.add_argument('--mosaic', type=float, default=1.0,
                        help='Mosaic augmentation probability')

    # SageMaker paths
    parser.add_argument('--model-dir', type=str, default=os.environ.get('SM_MODEL_DIR', '/opt/ml/model'))
    parser.add_argument('--train', type=str, default=os.environ.get('SM_CHANNEL_TRAIN', '/opt/ml/input/data/train'))
    parser.add_argument('--output-data-dir', type=str, default=os.environ.get('SM_OUTPUT_DATA_DIR', '/opt/ml/output'))

    return parser.parse_args()


def create_dataset_yaml(train_dir: str, output_dir: str) -> str:
    """
    Create dataset.yaml file for YOLO training in SageMaker environment.

    Args:
        train_dir: Path to training data directory
        output_dir: Path to output directory

    Returns:
        Path to created dataset.yaml file
    """
    train_path = Path(train_dir)

    # SageMaker structure: /opt/ml/input/data/train/
    #   ├── images/
    #   │   ├── train/
    #   │   ├── val/
    #   │   └── test/
    #   └── labels/
    #       ├── train/
    #       ├── val/
    #       └── test/

    dataset_config = {
        'path': str(train_path.absolute()),
        'train': 'images/train',
        'val': 'images/val',
        'test': 'images/test',
        'nc': 10,
        'names': [
            'Bedroom',
            'LivingRoom',
            'Kitchen',
            'Bathroom',
            'Dining',
            'Entry',
            'Closet',
            'Utility',
            'Outdoor',
            'Other'
        ]
    }

    # Save to output directory
    yaml_path = Path(output_dir) / 'dataset.yaml'
    yaml_path.parent.mkdir(parents=True, exist_ok=True)

    import yaml
    with open(yaml_path, 'w') as f:
        yaml.dump(dataset_config, f, default_flow_style=False)

    print(f"Created dataset.yaml at {yaml_path}")
    print(f"Dataset configuration:\n{yaml.dump(dataset_config, default_flow_style=False)}")

    return str(yaml_path)


def train_model(args):
    """Train YOLO model on SageMaker."""
    print("=" * 80)
    print("YOLOv8 SageMaker Training Job")
    print("=" * 80)
    print(f"Model: {args.model}")
    print(f"Epochs: {args.epochs}")
    print(f"Image size: {args.imgsz}")
    print(f"Batch size: {args.batch}")
    print(f"Device: {args.device}")
    print(f"Training data: {args.train}")
    print(f"Model output: {args.model_dir}")
    print("=" * 80)

    # Create dataset.yaml for training
    dataset_yaml = create_dataset_yaml(args.train, args.output_data_dir)

    # Initialize YOLO model
    print(f"\nInitializing {args.model} model...")
    model = YOLO(args.model)

    # Train the model
    print("\nStarting training...")
    results = model.train(
        data=dataset_yaml,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        patience=args.patience,
        device=args.device,
        workers=args.workers,
        optimizer=args.optimizer,
        lr0=args.lr0,
        lrf=args.lrf,
        momentum=args.momentum,
        weight_decay=args.weight_decay,
        hsv_h=args.hsv_h,
        hsv_s=args.hsv_s,
        hsv_v=args.hsv_v,
        degrees=args.degrees,
        translate=args.translate,
        scale=args.scale,
        fliplr=args.fliplr,
        mosaic=args.mosaic,
        project=args.output_data_dir,
        name='yolo_training',
        exist_ok=True,
        pretrained=True,
        verbose=True,
        save=True,
        save_period=10,  # Save checkpoint every 10 epochs
        val=True,
        plots=True
    )

    print("\n" + "=" * 80)
    print("Training Complete!")
    print("=" * 80)

    # Get best model path
    best_model_path = Path(args.output_data_dir) / 'yolo_training' / 'weights' / 'best.pt'

    if best_model_path.exists():
        print(f"Best model saved at: {best_model_path}")

        # Copy best model to SageMaker model directory
        import shutil
        model_output = Path(args.model_dir) / 'best.pt'
        shutil.copy(str(best_model_path), str(model_output))
        print(f"Model copied to: {model_output}")

        # Save training metrics
        metrics = {
            'epochs_completed': args.epochs,
            'best_model': str(best_model_path),
            'model_size': args.model,
            'image_size': args.imgsz,
            'batch_size': args.batch
        }

        metrics_path = Path(args.model_dir) / 'training_metrics.json'
        with open(metrics_path, 'w') as f:
            json.dump(metrics, f, indent=2)
        print(f"Training metrics saved to: {metrics_path}")

    else:
        print(f"WARNING: Best model not found at {best_model_path}")

    # Validate the model
    print("\nRunning validation...")
    val_results = model.val()

    print("\n" + "=" * 80)
    print("Validation Results:")
    print("=" * 80)
    print(f"mAP@0.5: {val_results.box.map50:.4f}")
    print(f"mAP@0.5:0.95: {val_results.box.map:.4f}")
    print(f"Precision: {val_results.box.mp:.4f}")
    print(f"Recall: {val_results.box.mr:.4f}")
    print("=" * 80)

    return results


def main():
    """Main training function."""
    args = parse_args()

    # Check if training data exists
    train_path = Path(args.train)
    if not train_path.exists():
        raise FileNotFoundError(f"Training data not found at {train_path}")

    print(f"Training data found at: {train_path}")
    print(f"Contents: {list(train_path.iterdir())}")

    # Create output directories
    Path(args.model_dir).mkdir(parents=True, exist_ok=True)
    Path(args.output_data_dir).mkdir(parents=True, exist_ok=True)

    # Train model
    results = train_model(args)

    print("\n" + "=" * 80)
    print("SageMaker Training Job Complete!")
    print("=" * 80)


if __name__ == '__main__':
    main()
