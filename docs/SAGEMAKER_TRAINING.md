# SageMaker Training Guide - YOLOv8 Room Detection

Complete guide for training YOLOv8 room detection model on AWS SageMaker.

---

## Overview

This guide covers:
1. Prerequisites and setup
2. Uploading training data to S3
3. Launching SageMaker training job
4. Monitoring training progress
5. Deploying trained model to Lambda
6. Cost estimation and optimization

---

## Prerequisites

### 1. AWS Account Setup

**Required AWS Services:**
- ✅ SageMaker (for training)
- ✅ S3 (for data storage)
- ✅ IAM (for permissions)
- ✅ CloudWatch (for monitoring)

**IAM Role Requirements:**

Create a SageMaker execution role with these policies:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket/*",
        "arn:aws:s3:::your-bucket"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage"
      ],
      "Resource": "*"
    }
  ]
}
```

**Quick setup via AWS CLI:**
```bash
# Create SageMaker execution role
aws iam create-role \
  --role-name SageMakerYOLOExecutionRole \
  --assume-role-policy-document file://trust-policy.json

# Attach policies
aws iam attach-role-policy \
  --role-name SageMakerYOLOExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonSageMakerFullAccess

aws iam attach-role-policy \
  --role-name SageMakerYOLOExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
```

### 2. Python Environment

**Install dependencies:**
```bash
cd backend/src/training
pip install -r requirements-sagemaker.txt
```

**Required packages:**
- `boto3` - AWS SDK
- `sagemaker` - SageMaker Python SDK
- `ultralytics` - YOLOv8

### 3. AWS CLI Configuration

```bash
# Configure AWS credentials
aws configure

# Test configuration
aws sts get-caller-identity
```

---

## Step 1: Upload Training Data to S3

### Option A: Using Shell Script (Recommended)

```bash
# Set S3 bucket name
export S3_BUCKET=your-bucket-name
export AWS_REGION=us-east-1

# Upload data
./backend/src/training/scripts/upload_to_s3.sh
```

**What this does:**
- Creates S3 bucket if it doesn't exist
- Uploads preprocessed dataset (images + labels)
- Maintains directory structure for YOLO
- Shows upload progress and summary

**Expected output:**
```
S3 URI: s3://your-bucket/yolo-training/data/
  images/train/  - 3,300 images
  images/val/    - 707 images
  images/test/   - 709 images
  labels/train/  - 3,300 labels
  labels/val/    - 707 labels
  labels/test/   - 709 labels
  dataset.yaml   - YOLO config
```

### Option B: Using AWS CLI Directly

```bash
aws s3 sync data/processed s3://your-bucket/yolo-training/data/ \
  --region us-east-1 \
  --delete
```

### Option C: Using Python Launcher Script

The Python launcher script includes automatic upload:
```bash
python backend/src/training/scripts/launch_sagemaker_training.py \
  --bucket your-bucket \
  --role arn:aws:iam::ACCOUNT:role/SageMakerYOLOExecutionRole
```

---

## Step 2: Launch SageMaker Training Job

### Quick Start (Recommended Settings)

```bash
python backend/src/training/scripts/launch_sagemaker_training.py \
  --bucket your-bucket-name \
  --role arn:aws:iam::ACCOUNT_ID:role/SageMakerYOLOExecutionRole \
  --instance-type ml.p3.2xlarge \
  --epochs 100 \
  --batch-size 16 \
  --wait
```

### Configuration Options

**Instance Types** (GPU required for reasonable training time):

| Instance Type | GPU | vCPU | Memory | Cost/hour | Recommended For |
|--------------|-----|------|--------|-----------|-----------------|
| ml.g4dn.xlarge | T4 (16GB) | 4 | 16GB | $0.736 | Testing |
| ml.p3.2xlarge | V100 (16GB) | 8 | 61GB | $3.825 | **Production** |
| ml.p3.8xlarge | 4x V100 | 32 | 244GB | $14.688 | Large datasets |
| ml.p3.16xlarge | 8x V100 | 64 | 488GB | $28.152 | Distributed training |

**Hyperparameters:**

```bash
python backend/src/training/scripts/launch_sagemaker_training.py \
  --bucket your-bucket \
  --role arn:aws:iam::ACCOUNT_ID:role/SageMakerYOLOExecutionRole \
  --instance-type ml.p3.2xlarge \
  --model yolov8m.pt \           # Model size (n, s, m, l, x)
  --epochs 100 \                  # Training epochs
  --batch-size 16 \               # Batch size (auto if -1)
  --imgsz 640 \                   # Image size
  --wait                          # Wait for completion
```

**Advanced Options:**

```bash
python backend/src/training/scripts/launch_sagemaker_training.py \
  --bucket your-bucket \
  --role arn:aws:iam::ACCOUNT_ID:role/SageMakerYOLOExecutionRole \
  --instance-type ml.p3.2xlarge \
  --instance-count 1 \            # Multiple instances for distributed training
  --volume-size 50 \              # EBS volume size (GB)
  --max-runtime 43200 \           # Max runtime (seconds, 12 hours)
  --job-name yolo-custom-job \    # Custom job name
  --skip-upload                   # Skip data upload (if already in S3)
```

---

## Step 3: Monitor Training Progress

### Option A: Wait for Completion (--wait flag)

The launcher script will automatically monitor progress:
```
Status: InProgress..................
Status: Completed

Training Job Complete
Status: Completed
Training time: 7200 seconds
Billable time: 7200 seconds
```

### Option B: Check Status via AWS CLI

```bash
# Get job status
aws sagemaker describe-training-job \
  --training-job-name yolo-room-detection-20251109-120000

# List recent jobs
aws sagemaker list-training-jobs \
  --sort-by CreationTime \
  --sort-order Descending \
  --max-results 5
```

### Option C: CloudWatch Logs

```bash
# View training logs
aws logs tail /aws/sagemaker/TrainingJobs \
  --follow \
  --log-stream-name yolo-room-detection-20251109-120000/algo-1
```

### Option D: SageMaker Console

1. Go to: https://console.aws.amazon.com/sagemaker/
2. Navigate to: Training → Training jobs
3. Click on your job name
4. View metrics and logs in real-time

**Key Metrics to Monitor:**
- **mAP@0.5**: Target > 0.85 (85% accuracy)
- **Precision**: Target > 0.90 (90% correct detections)
- **Recall**: Target > 0.85 (85% of rooms detected)
- **Loss**: Should steadily decrease

---

## Step 4: Download Trained Model

### Automatic Download (--wait flag)

If you used `--wait`, the model is automatically downloaded to `models/best.pt`

### Manual Download

```bash
# Get model S3 URI
JOB_NAME=yolo-room-detection-20251109-120000
MODEL_URI=$(aws sagemaker describe-training-job \
  --training-job-name $JOB_NAME \
  --query 'ModelArtifacts.S3ModelArtifacts' \
  --output text)

echo "Model URI: $MODEL_URI"

# Download model
aws s3 cp $MODEL_URI models/model.tar.gz

# Extract model
tar -xzf models/model.tar.gz -C models/
```

**Model files:**
- `best.pt` - Best model weights (use this for deployment)
- `last.pt` - Last epoch weights
- `training_metrics.json` - Training statistics

---

## Step 5: Deploy to Lambda

### Update Lambda with Trained Model

```bash
cd backend/src/sagemaker

# Copy trained model
cp ../../models/best.pt models/best.pt

# Build Docker image with trained model
docker build -t room-detection-yolo:latest -f Dockerfile.yolo .

# Push to ECR and update Lambda (see DEPLOYMENT.md)
```

**See full deployment guide:** `backend/src/sagemaker/DEPLOYMENT.md`

---

## Cost Estimation

### Training Costs (Single Run)

**ml.p3.2xlarge (Recommended):**
- Instance: $3.825/hour
- Expected time: 2-3 hours
- **Total: $7.65 - $11.48 per training run**

**ml.g4dn.xlarge (Budget):**
- Instance: $0.736/hour
- Expected time: 6-8 hours
- **Total: $4.42 - $5.89 per training run**

### Storage Costs (S3)

- Training data: ~2GB = $0.05/month
- Model artifacts: ~100MB = $0.002/month
- Logs: ~50MB = $0.001/month

**Total S3: ~$0.06/month**

### Total First Month Cost Estimate

- Training (1 run): **$8-12**
- S3 storage: **$0.06**
- Lambda inference (1K requests): **$0.20**

**Total: ~$10-15 for initial training + deployment**

### Cost Optimization Tips

1. **Use Spot Instances** (50-90% discount):
```bash
--use-spot-instances \
--max-wait-time 43200
```

2. **Stop Early** (if metrics plateau):
```bash
--patience 20  # Stop after 20 epochs without improvement
```

3. **Smaller Model** (faster training):
```bash
--model yolov8s.pt  # Smaller model, faster training
```

4. **Managed Spot Training**:
```python
estimator = PyTorch(
    ...
    use_spot_instances=True,
    max_wait=43200,
    max_run=14400
)
```

---

## Troubleshooting

### Issue: Training Job Fails to Start

**Error**: "ClientError: Role ARN is invalid"

**Solution**: Verify IAM role exists and has correct permissions:
```bash
aws iam get-role --role-name SageMakerYOLOExecutionRole
```

### Issue: Out of Memory (OOM)

**Error**: "RuntimeError: CUDA out of memory"

**Solution**: Reduce batch size:
```bash
--batch-size 8  # Instead of 16
```

Or use larger instance:
```bash
--instance-type ml.p3.8xlarge  # 4x V100 GPUs
```

### Issue: Data Not Found

**Error**: "FileNotFoundError: Training data not found"

**Solution**: Verify S3 data path:
```bash
aws s3 ls s3://your-bucket/yolo-training/data/images/train/
```

### Issue: Slow Training

**Symptom**: Training taking > 6 hours on ml.p3.2xlarge

**Solution**:
1. Check GPU utilization in CloudWatch
2. Increase number of workers: `--workers 16`
3. Use fp16 mixed precision (automatic in PyTorch 2.1+)

### Issue: Low Accuracy

**Symptom**: mAP@0.5 < 0.70 after training

**Solution**:
1. Train longer: `--epochs 200`
2. Use larger model: `--model yolov8l.pt`
3. Check data quality (review failed samples)
4. Adjust learning rate: `--lr0 0.001`

---

## Advanced: Multi-GPU Training

For faster training with multiple GPUs:

```bash
python backend/src/training/scripts/launch_sagemaker_training.py \
  --bucket your-bucket \
  --role arn:aws:iam::ACCOUNT_ID:role/SageMakerYOLOExecutionRole \
  --instance-type ml.p3.8xlarge \  # 4x V100 GPUs
  --instance-count 1 \
  --batch-size 64 \                 # Larger batch for multi-GPU
  --epochs 100
```

---

## Advanced: Distributed Training (Multiple Instances)

For very large datasets:

```bash
python backend/src/training/scripts/launch_sagemaker_training.py \
  --bucket your-bucket \
  --role arn:aws:iam::ACCOUNT_ID:role/SageMakerYOLOExecutionRole \
  --instance-type ml.p3.2xlarge \
  --instance-count 4 \              # 4 instances
  --batch-size 64 \
  --epochs 100
```

---

## Next Steps

After successful training:

1. ✅ **Validate Model**: Test on holdout dataset
2. ✅ **Deploy to Lambda**: Update Lambda function with trained model
3. ✅ **A/B Test**: Compare YOLO vs OpenCV performance
4. ✅ **Monitor Performance**: Track accuracy in production
5. ✅ **Retrain**: Periodically retrain with new data

---

## Quick Reference

**Launch training:**
```bash
python backend/src/training/scripts/launch_sagemaker_training.py \
  --bucket YOUR_BUCKET \
  --role arn:aws:iam::ACCOUNT:role/SageMakerYOLOExecutionRole \
  --instance-type ml.p3.2xlarge \
  --epochs 100 \
  --wait
```

**Check status:**
```bash
aws sagemaker list-training-jobs --max-results 5
```

**Download model:**
```bash
aws s3 cp s3://YOUR_BUCKET/yolo-training/output/JOB_NAME/output/model.tar.gz models/
```

**Deploy to Lambda:**
See `backend/src/sagemaker/DEPLOYMENT.md`

---

**Status**: ✅ SageMaker training setup complete
**Last Updated**: 2025-11-09
