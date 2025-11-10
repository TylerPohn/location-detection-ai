"""
Launch YOLOv8 training job on AWS SageMaker.

This script:
1. Uploads training data to S3
2. Creates SageMaker training job with GPU instance
3. Monitors training progress
4. Downloads trained model after completion
"""

import argparse
import boto3
import sagemaker
from sagemaker.pytorch import PyTorch
from pathlib import Path
import time
import json
from datetime import datetime


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Launch SageMaker YOLO training job')

    # AWS configuration
    parser.add_argument('--region', type=str, default='us-east-1',
                        help='AWS region')
    parser.add_argument('--role', type=str, required=True,
                        help='SageMaker execution role ARN')
    parser.add_argument('--bucket', type=str, required=True,
                        help='S3 bucket for training data and outputs')

    # Training data
    parser.add_argument('--data-dir', type=str, default='data/processed',
                        help='Local directory with preprocessed data')
    parser.add_argument('--s3-prefix', type=str, default='yolo-training',
                        help='S3 prefix for training data')

    # Training configuration
    parser.add_argument('--instance-type', type=str, default='ml.p3.2xlarge',
                        help='SageMaker instance type (ml.p3.2xlarge, ml.p3.8xlarge, ml.g4dn.xlarge)')
    parser.add_argument('--instance-count', type=int, default=1,
                        help='Number of training instances')
    parser.add_argument('--volume-size', type=int, default=50,
                        help='EBS volume size in GB')
    parser.add_argument('--max-runtime', type=int, default=43200,
                        help='Max runtime in seconds (default: 12 hours)')

    # Model hyperparameters
    parser.add_argument('--model', type=str, default='yolov8m.pt',
                        help='YOLO model size')
    parser.add_argument('--epochs', type=int, default=100,
                        help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=16,
                        help='Batch size')
    parser.add_argument('--imgsz', type=int, default=640,
                        help='Image size')

    # Job configuration
    parser.add_argument('--job-name', type=str, default=None,
                        help='Training job name (auto-generated if not provided)')
    parser.add_argument('--wait', action='store_true',
                        help='Wait for training job to complete')
    parser.add_argument('--skip-upload', action='store_true',
                        help='Skip data upload (data already in S3)')

    return parser.parse_args()


def upload_training_data(data_dir: str, bucket: str, s3_prefix: str, skip_upload: bool = False):
    """
    Upload training data to S3.

    Args:
        data_dir: Local directory with preprocessed data
        bucket: S3 bucket name
        s3_prefix: S3 prefix for training data
        skip_upload: Skip upload if data already in S3

    Returns:
        S3 URI for training data
    """
    s3_uri = f"s3://{bucket}/{s3_prefix}/data"

    if skip_upload:
        print(f"Skipping upload, using existing data at: {s3_uri}")
        return s3_uri

    print("=" * 80)
    print("Uploading Training Data to S3")
    print("=" * 80)

    data_path = Path(data_dir)
    if not data_path.exists():
        raise FileNotFoundError(f"Data directory not found: {data_dir}")

    # Use boto3 to upload
    s3_client = boto3.client('s3')

    # Upload all files
    total_files = 0
    total_size = 0

    for file_path in data_path.rglob('*'):
        if file_path.is_file():
            # Calculate relative path
            relative_path = file_path.relative_to(data_path)
            s3_key = f"{s3_prefix}/data/{relative_path}"

            # Upload file
            print(f"Uploading: {relative_path}")
            s3_client.upload_file(str(file_path), bucket, s3_key)

            total_files += 1
            total_size += file_path.stat().st_size

    print(f"\nUploaded {total_files} files ({total_size / (1024**2):.2f} MB)")
    print(f"S3 URI: {s3_uri}")

    return s3_uri


def create_training_job(args, s3_data_uri: str):
    """
    Create and launch SageMaker training job.

    Args:
        args: Command line arguments
        s3_data_uri: S3 URI for training data

    Returns:
        SageMaker estimator
    """
    print("\n" + "=" * 80)
    print("Creating SageMaker Training Job")
    print("=" * 80)

    # Generate job name if not provided
    if args.job_name is None:
        timestamp = datetime.now().strftime('%Y%m%d-%H%M%S')
        args.job_name = f"yolo-room-detection-{timestamp}"

    print(f"Job name: {args.job_name}")
    print(f"Instance type: {args.instance_type}")
    print(f"Instance count: {args.instance_count}")
    print(f"Max runtime: {args.max_runtime / 3600:.1f} hours")

    # Create SageMaker session
    sagemaker_session = sagemaker.Session()
    role = args.role

    # Hyperparameters
    hyperparameters = {
        'model': args.model,
        'epochs': args.epochs,
        'imgsz': args.imgsz,
        'batch': args.batch_size,
        'patience': 20,
        'device': '0',  # Use first GPU
        'workers': 8,
        'optimizer': 'auto',
        'lr0': 0.01,
        'lrf': 0.01,
        'momentum': 0.937,
        'weight_decay': 0.0005
    }

    print(f"\nHyperparameters:")
    for key, value in hyperparameters.items():
        print(f"  {key}: {value}")

    # Create PyTorch estimator
    estimator = PyTorch(
        entry_point='train_sagemaker.py',
        source_dir='backend/src/training/scripts',
        role=role,
        instance_type=args.instance_type,
        instance_count=args.instance_count,
        framework_version='2.1.0',
        py_version='py310',
        hyperparameters=hyperparameters,
        output_path=f"s3://{args.bucket}/{args.s3_prefix}/output",
        code_location=f"s3://{args.bucket}/{args.s3_prefix}/code",
        sagemaker_session=sagemaker_session,
        volume_size=args.volume_size,
        max_run=args.max_runtime,
        base_job_name='yolo-room-detection',
        tags=[
            {'Key': 'Project', 'Value': 'RoomDetection'},
            {'Key': 'Model', 'Value': 'YOLOv8'},
            {'Key': 'Task', 'Value': 'Training'}
        ],
        environment={
            'PYTHONUNBUFFERED': '1'
        }
    )

    # Start training
    print("\n" + "=" * 80)
    print("Starting Training Job")
    print("=" * 80)

    estimator.fit(
        inputs={'train': s3_data_uri},
        job_name=args.job_name,
        wait=args.wait,
        logs='All'
    )

    print(f"\nTraining job started: {args.job_name}")
    print(f"Training output: s3://{args.bucket}/{args.s3_prefix}/output/{args.job_name}")

    return estimator


def monitor_training_job(job_name: str, region: str):
    """
    Monitor training job progress.

    Args:
        job_name: SageMaker training job name
        region: AWS region
    """
    print("\n" + "=" * 80)
    print("Monitoring Training Job")
    print("=" * 80)

    sagemaker_client = boto3.client('sagemaker', region_name=region)

    while True:
        response = sagemaker_client.describe_training_job(TrainingJobName=job_name)
        status = response['TrainingJobStatus']

        print(f"\rStatus: {status}", end='', flush=True)

        if status in ['Completed', 'Failed', 'Stopped']:
            print()  # New line
            break

        time.sleep(30)

    # Print final status
    print("\n" + "=" * 80)
    print("Training Job Complete")
    print("=" * 80)
    print(f"Status: {response['TrainingJobStatus']}")
    print(f"Training time: {response.get('TrainingTimeInSeconds', 0)} seconds")
    print(f"Billable time: {response.get('BillableTimeInSeconds', 0)} seconds")

    if 'FailureReason' in response:
        print(f"Failure reason: {response['FailureReason']}")

    return response


def download_trained_model(estimator, output_dir: str = 'models'):
    """
    Download trained model from S3.

    Args:
        estimator: SageMaker estimator
        output_dir: Local directory to save model
    """
    print("\n" + "=" * 80)
    print("Downloading Trained Model")
    print("=" * 80)

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    # Get model S3 path
    model_s3_uri = estimator.model_data
    print(f"Model S3 URI: {model_s3_uri}")

    # Download model
    local_model_path = output_path / 'model.tar.gz'
    s3_client = boto3.client('s3')

    # Parse S3 URI
    bucket = model_s3_uri.split('/')[2]
    key = '/'.join(model_s3_uri.split('/')[3:])

    print(f"Downloading to: {local_model_path}")
    s3_client.download_file(bucket, key, str(local_model_path))

    # Extract model
    import tarfile
    with tarfile.open(local_model_path, 'r:gz') as tar:
        tar.extractall(output_path)

    print(f"Model extracted to: {output_path}")
    print(f"Best model: {output_path / 'best.pt'}")

    return output_path


def main():
    """Main function."""
    args = parse_args()

    print("=" * 80)
    print("YOLOv8 SageMaker Training Launcher")
    print("=" * 80)
    print(f"Region: {args.region}")
    print(f"S3 Bucket: {args.bucket}")
    print(f"Instance: {args.instance_type}")
    print("=" * 80)

    try:
        # Step 1: Upload training data to S3
        s3_data_uri = upload_training_data(
            args.data_dir,
            args.bucket,
            args.s3_prefix,
            args.skip_upload
        )

        # Step 2: Create and launch training job
        estimator = create_training_job(args, s3_data_uri)

        # Step 3: Monitor training (if wait flag is set)
        if args.wait:
            response = monitor_training_job(args.job_name, args.region)

            if response['TrainingJobStatus'] == 'Completed':
                # Step 4: Download trained model
                download_trained_model(estimator)
            else:
                print(f"\nTraining job did not complete successfully")
                return 1

        else:
            print("\n" + "=" * 80)
            print("Training job launched successfully!")
            print("=" * 80)
            print(f"\nTo monitor progress:")
            print(f"  aws sagemaker describe-training-job --training-job-name {args.job_name}")
            print(f"\nTo view logs:")
            print(f"  aws sagemaker list-training-jobs --name-contains {args.job_name}")

        print("\n✅ SageMaker training job setup complete!")
        return 0

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    exit(main())
