"""
Quick launcher for SageMaker YOLO training job.
Uses environment variables for AWS credentials.
"""

import os
import boto3
import sagemaker
from sagemaker.pytorch import PyTorch
from datetime import datetime

# Configuration
BUCKET = "room-detection-yolo-training-202511"
ROLE_ARN = "arn:aws:iam::971422717446:role/room-detection-sagemaker-role"
REGION = "us-east-2"
S3_DATA_URI = f"s3://{BUCKET}/yolo-training/data"

def main():
    print("=" * 80)
    print("YOLOv8 SageMaker Training Job Launcher")
    print("=" * 80)
    print(f"Bucket: {BUCKET}")
    print(f"Role: {ROLE_ARN}")
    print(f"Region: {REGION}")
    print(f"Data: {S3_DATA_URI}")
    print("=" * 80)

    # Generate job name
    timestamp = datetime.now().strftime('%Y%m%d-%H%M%S')
    job_name = f"yolo-room-detection-{timestamp}"

    print(f"\nJob name: {job_name}")
    print(f"Instance: ml.p3.2xlarge (V100 GPU)")
    print(f"Expected time: 2-3 hours")
    print(f"Expected cost: $8-12")

    # Create SageMaker session
    boto_session = boto3.Session(region_name=REGION)
    sagemaker_session = sagemaker.Session(boto_session=boto_session)

    # Hyperparameters
    hyperparameters = {
        'model': 'yolov8m.pt',
        'epochs': 100,
        'imgsz': 640,
        'batch': 16,
        'patience': 20,
        'device': '0',
        'workers': 8,
        'optimizer': 'auto',
        'lr0': 0.01,
        'lrf': 0.01
    }

    print(f"\nHyperparameters:")
    for key, value in hyperparameters.items():
        print(f"  {key}: {value}")

    # Create PyTorch estimator
    print("\nCreating SageMaker estimator...")
    estimator = PyTorch(
        entry_point='train_sagemaker.py',
        source_dir='backend/src/training/scripts',
        role=ROLE_ARN,
        instance_type='ml.p3.2xlarge',
        instance_count=1,
        framework_version='2.1.0',
        py_version='py310',
        hyperparameters=hyperparameters,
        output_path=f"s3://{BUCKET}/yolo-training/output",
        code_location=f"s3://{BUCKET}/yolo-training/code",
        sagemaker_session=sagemaker_session,
        volume_size=50,
        max_run=43200,  # 12 hours
        base_job_name='yolo-room-detection',
        tags=[
            {'Key': 'Project', 'Value': 'RoomDetection'},
            {'Key': 'Model', 'Value': 'YOLOv8'}
        ]
    )

    # Start training
    print("\n" + "=" * 80)
    print("Starting Training Job")
    print("=" * 80)

    estimator.fit(
        inputs={'train': S3_DATA_URI},
        job_name=job_name,
        wait=False,  # Don't wait, let it run async
        logs='All'
    )

    print(f"\n✅ Training job started successfully!")
    print(f"\nJob name: {job_name}")
    print(f"Output: s3://{BUCKET}/yolo-training/output/{job_name}/")

    print(f"\nMonitor progress:")
    print(f"  aws sagemaker describe-training-job --training-job-name {job_name} --region {REGION}")

    print(f"\nView logs:")
    print(f"  aws logs tail /aws/sagemaker/TrainingJobs --follow --log-stream-name {job_name}/algo-1 --region {REGION}")

    print(f"\nSageMaker Console:")
    print(f"  https://{REGION}.console.aws.amazon.com/sagemaker/home?region={REGION}#/jobs/{job_name}")

    return job_name

if __name__ == '__main__':
    job_name = main()
