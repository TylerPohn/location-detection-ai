# YOLO Detector Deployment Guide

This guide covers deploying the YOLOv8-based room detection model to AWS Lambda.

## Prerequisites

1. ✅ Trained YOLO model (`backend/src/models/best.pt`)
2. ✅ AWS account with Lambda and ECR access
3. ✅ Docker installed locally
4. ✅ AWS CLI configured

---

## Deployment Steps

### 1. Train YOLO Model (if not done)

```bash
# Install YOLOv8
pip install ultralytics

# Train model
yolo detect train \
  data=data/processed/dataset.yaml \
  model=yolov8m.pt \
  epochs=100 \
  imgsz=640 \
  batch=16 \
  patience=20

# Copy best weights to sagemaker directory
mkdir -p backend/src/sagemaker/models
cp runs/detect/train/weights/best.pt backend/src/sagemaker/models/
```

### 2. Build Docker Image

```bash
cd backend/src/sagemaker

# Build YOLO Lambda container
docker build -t room-detection-yolo:latest -f Dockerfile.yolo .

# Test locally (optional)
docker run -p 9000:8080 room-detection-yolo:latest

# In another terminal, test with curl
curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" \
  -d '{
    "bucket": "test-bucket",
    "key": "test.png",
    "jobId": "test-001",
    "timestamp": "2025-01-01T00:00:00Z"
  }'
```

### 3. Push to ECR

```bash
# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=us-east-1  # Change to your region

# Create ECR repository (if doesn't exist)
aws ecr create-repository \
  --repository-name room-detection-yolo \
  --region ${AWS_REGION}

# Authenticate Docker to ECR
aws ecr get-login-password --region ${AWS_REGION} | \
  docker login --username AWS --password-stdin \
  ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Tag image
docker tag room-detection-yolo:latest \
  ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/room-detection-yolo:latest

# Push to ECR
docker push \
  ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/room-detection-yolo:latest
```

### 4. Update Lambda Function

**Option A: Using AWS Console**

1. Go to Lambda console
2. Select your function (or create new)
3. Under "Code" → "Image", paste ECR image URI
4. Update environment variables:
   - `RESULTS_BUCKET_NAME`: Your S3 bucket for results
   - `YOLO_MODEL_PATH`: `/var/task/models/best.pt`
   - `YOLO_CONF_THRESHOLD`: `0.25`
   - `YOLO_IOU_THRESHOLD`: `0.45`
5. Update configuration:
   - Memory: **3GB minimum** (for PyTorch)
   - Timeout: **30 seconds**
   - Ephemeral storage: **512 MB**

**Option B: Using AWS CLI**

```bash
# Create Lambda function (if doesn't exist)
aws lambda create-function \
  --function-name room-detection-yolo \
  --package-type Image \
  --code ImageUri=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/room-detection-yolo:latest \
  --role arn:aws:iam::${AWS_ACCOUNT_ID}:role/lambda-execution-role \
  --memory-size 3008 \
  --timeout 30 \
  --environment Variables="{
    RESULTS_BUCKET_NAME=your-results-bucket,
    YOLO_MODEL_PATH=/var/task/models/best.pt,
    YOLO_CONF_THRESHOLD=0.25,
    YOLO_IOU_THRESHOLD=0.45
  }"

# Or update existing function
aws lambda update-function-code \
  --function-name room-detection-yolo \
  --image-uri ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/room-detection-yolo:latest
```

### 5. Update Infrastructure (CDK)

Update `infrastructure/lib/lambda-stack.ts`:

```typescript
// Replace OpenCV Lambda with YOLO Lambda
const roomDetectionFunction = new lambda.DockerImageFunction(this, 'RoomDetectionYOLO', {
  code: lambda.DockerImageCode.fromEcr(
    ecr.Repository.fromRepositoryName(this, 'YOLORepo', 'room-detection-yolo')
  ),
  memorySize: 3008,  // 3GB for PyTorch
  timeout: cdk.Duration.seconds(30),
  environment: {
    RESULTS_BUCKET_NAME: resultsBucket.bucketName,
    YOLO_MODEL_PATH: '/var/task/models/best.pt',
    YOLO_CONF_THRESHOLD: '0.25',
    YOLO_IOU_THRESHOLD: '0.45'
  }
});
```

Deploy:
```bash
cd infrastructure
cdk deploy
```

---

## Testing

### Test Locally

```bash
# Test YOLO detector directly
python3 backend/src/sagemaker/detector/yolo_detector.py \
  data/processed/images/test/10004.png \
  backend/src/sagemaker/models/best.pt
```

### Test Lambda

```bash
# Invoke Lambda function
aws lambda invoke \
  --function-name room-detection-yolo \
  --payload '{
    "bucket": "your-blueprints-bucket",
    "key": "blueprints/test.png",
    "jobId": "test-001",
    "timestamp": "2025-01-01T00:00:00Z"
  }' \
  response.json

# Check response
cat response.json | jq .
```

---

## Performance Optimization

### Cold Start Optimization

**Problem**: First invocation takes 10-30s (model loading)

**Solutions**:

1. **Provisioned Concurrency** (recommended for production):
```bash
aws lambda put-provisioned-concurrency-config \
  --function-name room-detection-yolo \
  --provisioned-concurrent-executions 2
```

2. **Keep warm with CloudWatch Events**:
```bash
# Ping every 5 minutes to keep warm
aws events put-rule \
  --name keep-lambda-warm \
  --schedule-expression "rate(5 minutes)"
```

3. **Lazy Loading**: Model loads on first inference (already implemented)

### Memory Optimization

**Current**: 3GB (PyTorch + YOLO model)

**Optimization options**:
1. Use CPU-only PyTorch (already using)
2. Model quantization (FP16 or INT8)
3. ONNX export for smaller runtime

### Inference Speed Optimization

**Target**: <200ms per image

**Optimizations**:
1. Image resizing before inference (640x640)
2. Batch processing (process multiple images at once)
3. GPU instances (if cost allows)

---

## Cost Estimation

### Lambda Costs

**Configuration**:
- Memory: 3GB
- Avg execution time: 200ms
- Requests: 1,000/month

**Cost breakdown**:
- Compute: $0.20 per 1,000 requests
- Provisioned concurrency: +$40/month (optional)

**Total**: ~$0.20/month (cold start) or ~$40/month (provisioned)

### Comparison: OpenCV vs YOLO

| Metric | OpenCV | YOLO |
|--------|--------|------|
| Memory | 512MB | 3GB |
| Execution time | ~100ms | ~200ms |
| Cost per 1K requests | $0.05 | $0.20 |
| Accuracy | ~50% | **~90%** |

**Value**: 4x cost, 2x accuracy improvement = Worth it!

---

## Rollback Plan

If YOLO deployment has issues, rollback to OpenCV:

```bash
# Revert Lambda function code
aws lambda update-function-code \
  --function-name room-detection \
  --image-uri ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/room-detection-opencv:latest

# Or use CDK
cd infrastructure
git checkout main  # Revert to OpenCV config
cdk deploy
```

---

## Monitoring

### CloudWatch Metrics

Monitor these metrics:
- **Invocations**: Total requests
- **Duration**: Execution time (target: <200ms)
- **Errors**: Failed invocations
- **Throttles**: Rate limit hits
- **ConcurrentExecutions**: Active instances

### CloudWatch Logs

Check logs for:
- Model loading time
- Inference time per image
- Room detection counts
- Errors and stack traces

### Custom Metrics

Add custom metrics in Lambda:
```python
import boto3
cloudwatch = boto3.client('cloudwatch')

# Track room count distribution
cloudwatch.put_metric_data(
    Namespace='RoomDetection',
    MetricData=[{
        'MetricName': 'RoomsDetected',
        'Value': len(rooms),
        'Unit': 'Count'
    }]
)
```

---

## Troubleshooting

### Issue: Model not found

**Error**: `FileNotFoundError: /var/task/models/best.pt`

**Solution**: Ensure model is copied in Dockerfile:
```dockerfile
COPY models/best.pt ${LAMBDA_TASK_ROOT}/models/best.pt
```

### Issue: Out of memory

**Error**: `Runtime exited with error: signal: killed`

**Solution**: Increase Lambda memory:
```bash
aws lambda update-function-configuration \
  --function-name room-detection-yolo \
  --memory-size 4096  # Increase to 4GB
```

### Issue: Timeout

**Error**: `Task timed out after 30.00 seconds`

**Solution**:
1. Increase timeout
2. Optimize model (reduce image size, use ONNX)
3. Check S3 download speed

### Issue: Low accuracy

**Problem**: Rooms not detected or wrong classifications

**Solution**:
1. Check confidence threshold (lower if needed)
2. Retrain model with more data
3. Adjust IoU threshold for NMS

---

## Next Steps

1. **A/B Testing**: Run YOLO and OpenCV in parallel
2. **Model Monitoring**: Track accuracy over time
3. **Continuous Training**: Retrain with new blueprints
4. **Multi-Model**: Support multiple YOLO versions

---

**Status**: ✅ Deployment guide complete
**Last Updated**: 2025-11-09
