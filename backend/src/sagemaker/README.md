# SageMaker Async Inference Deployment

## Overview

This directory contains the SageMaker async inference setup for the Location Detection AI system. It packages the OpenCV detector as a containerized model that can be deployed to AWS SageMaker for scalable, serverless blueprint processing.

## Prerequisites

- Docker installed locally
- AWS CLI configured with appropriate credentials
- ECR repository access
- SageMaker permissions

## Directory Structure

```
sagemaker/
├── inference.py           # SageMaker inference script
├── requirements.txt       # Python dependencies
├── Dockerfile            # Container definition
├── build-and-push.sh     # Build and ECR push script
├── detector/             # OpenCV detector module
│   ├── __init__.py
│   └── opencv_detector.py
└── README.md            # This file
```

## Build and Deploy Steps

### 1. Build and Push Docker Image

```bash
cd backend/src/sagemaker

# Set environment variables
export AWS_ACCOUNT_ID=123456789012
export AWS_REGION=us-east-1
export IMAGE_TAG=latest

# Make build script executable
chmod +x build-and-push.sh

# Build and push to ECR
./build-and-push.sh
```

This will:
- Build the Docker image with all dependencies
- Tag it for ECR
- Authenticate with ECR
- Create the ECR repository if needed
- Push the image to ECR

### 2. Deploy Infrastructure

```bash
cd ../../../infrastructure

# Set model image URI from previous step
export MODEL_IMAGE_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/location-detector:${IMAGE_TAG}"

# Install dependencies
npm install

# Deploy all stacks
npm run deploy
```

### 3. Test Endpoint

```bash
# Upload test blueprint
aws s3 cp test-blueprint.png s3://location-detection-blueprints-dev/blueprints/test-001.png

# Monitor CloudWatch Logs
aws logs tail /aws/lambda/inference-trigger --follow

# Check results
aws s3 ls s3://location-detection-results-dev/sagemaker-output/

# Download results
aws s3 cp s3://location-detection-results-dev/sagemaker-output/test-001.out ./test-results.json

# View results
cat test-results.json | jq
```

## Local Testing

### Test Inference Script

```bash
# Build Docker image
docker build -t location-detector:test .

# Test import
docker run -it location-detector:test python -c "from inference import model_fn; print('OK')"

# Run container interactively
docker run -it --rm location-detector:test /bin/bash

# Inside container, test detector
python -c "
from detector.opencv_detector import OpenCVDetector
detector = OpenCVDetector()
print('Detector initialized successfully')
"
```

### Test with Local Image

```bash
# Create test script
cat > test_local.py << 'EOF'
import cv2
from inference import model_fn, predict_fn

# Initialize model
detector = model_fn('/opt/ml/model')

# Load test image
image = cv2.imread('test-blueprint.png')

# Run inference
input_data = {'image': image, 'metadata': {}}
result = predict_fn(input_data, detector)

print(f"Detected {result['room_count']} rooms")
EOF

# Run test
docker run -v $(pwd):/data -w /data location-detector:test python test_local.py
```

## Monitoring

### CloudWatch Logs

```bash
# SageMaker endpoint logs
aws logs tail /aws/sagemaker/Endpoints/location-detector-dev --follow

# Lambda trigger logs
aws logs tail /aws/lambda/LocationDetection-dev-InferenceTrigger --follow

# View recent errors
aws logs filter-pattern /aws/sagemaker/Endpoints/location-detector-dev --filter-pattern "ERROR" --start-time -1h
```

### CloudWatch Metrics

Navigate to CloudWatch Console:
- SageMaker > Endpoints > location-detector-dev
- View metrics:
  - ModelLatency
  - Invocations
  - InvocationErrors
  - AsyncInvocationsQueued
  - AsyncInvocationsConcurrent

### SNS Notifications

```bash
# Subscribe email to notifications
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:location-detection-inference-dev \
  --protocol email \
  --notification-endpoint your-email@example.com

# Confirm subscription from email
```

## Troubleshooting

### Endpoint Creation Fails

**Symptoms:** CloudFormation stack fails during endpoint creation

**Solutions:**
1. Check IAM role permissions:
   ```bash
   aws iam get-role --role-name LocationDetection-dev-SageMakerRole
   ```

2. Verify ECR image exists:
   ```bash
   aws ecr describe-images --repository-name location-detector
   ```

3. Review CloudFormation events:
   ```bash
   aws cloudformation describe-stack-events --stack-name LocationDetection-dev-SageMaker
   ```

### Inference Times Out

**Symptoms:** Inference requests timeout or take too long

**Solutions:**
1. Increase endpoint instance size in `sagemaker-stack.ts`:
   ```typescript
   instanceType: 'ml.m5.2xlarge', // from ml.m5.xlarge
   ```

2. Check image preprocessing complexity:
   - Large images may need resizing
   - Adjust OpenCV parameters

3. Review CloudWatch logs for bottlenecks:
   ```bash
   aws logs tail /aws/sagemaker/Endpoints/location-detector-dev --since 1h
   ```

### No Results in S3

**Symptoms:** Inference completes but no output in results bucket

**Solutions:**
1. Verify S3 event notification:
   ```bash
   aws s3api get-bucket-notification-configuration \
     --bucket location-detection-blueprints-dev
   ```

2. Check Lambda function execution:
   ```bash
   aws lambda get-function --function-name LocationDetection-dev-InferenceTrigger
   aws logs tail /aws/lambda/LocationDetection-dev-InferenceTrigger --follow
   ```

3. Review SageMaker endpoint logs:
   ```bash
   aws logs tail /aws/sagemaker/Endpoints/location-detector-dev --follow
   ```

### Docker Build Fails

**Symptoms:** Docker build command fails with errors

**Solutions:**
1. Check Docker daemon is running:
   ```bash
   docker info
   ```

2. Verify all files exist:
   ```bash
   ls -la inference.py requirements.txt Dockerfile detector/
   ```

3. Check for syntax errors:
   ```bash
   python -m py_compile inference.py
   python -m py_compile detector/opencv_detector.py
   ```

### ECR Push Fails

**Symptoms:** Cannot authenticate or push to ECR

**Solutions:**
1. Verify AWS credentials:
   ```bash
   aws sts get-caller-identity
   ```

2. Check ECR permissions:
   ```bash
   aws ecr get-authorization-token
   ```

3. Manually authenticate:
   ```bash
   aws ecr get-login-password --region us-east-1 | \
     docker login --username AWS --password-stdin \
     123456789012.dkr.ecr.us-east-1.amazonaws.com
   ```

## Configuration

### Model Configuration

Create `config.json` in your model artifacts directory to customize detector parameters:

```json
{
  "min_area": 1000,
  "max_area": 1000000,
  "epsilon_factor": 0.01
}
```

### Endpoint Configuration

Modify `infrastructure/lib/sagemaker-stack.ts` to adjust:

- **Instance Type:** `ml.m5.xlarge`, `ml.m5.2xlarge`, etc.
- **Instance Count:** For high availability
- **Max Concurrent Invocations:** Adjust based on load
- **S3 Output Path:** Where results are stored

## Cost Considerations

### SageMaker Costs

- **ml.m5.xlarge:** ~$0.23/hour
- **Async inference:** Scales to zero when idle
- **First inference:** Cold start can take 3-5 minutes
- **Storage:** Minimal S3 costs for input/output

### Optimization Tips

1. **Use async inference:** No charge when idle
2. **Right-size instances:** Start small, scale up if needed
3. **Monitor usage:** Set up billing alerts
4. **Clean up:** Delete endpoints when not in use

## Architecture

```
┌─────────────┐
│   S3 Upload │
│  (Blueprint)│
└──────┬──────┘
       │ Event
       ↓
┌──────────────┐
│   Lambda     │
│  (Trigger)   │
└──────┬───────┘
       │ InvokeAsync
       ↓
┌──────────────────────┐
│  SageMaker Endpoint  │
│  (Async Inference)   │
│  ┌────────────────┐  │
│  │ OpenCV Detector│  │
│  └────────────────┘  │
└──────┬───────────────┘
       │ Results
       ↓
┌──────────────┐    ┌─────────┐
│  S3 Results  │←───│   SNS   │
│   Bucket     │    │Notification
└──────────────┘    └─────────┘
```

## Next Steps

1. Monitor endpoint performance
2. Tune detector parameters based on results
3. Implement result processing pipeline
4. Add error handling and retry logic
5. Set up automated testing

## Support

For issues or questions:
1. Check CloudWatch logs first
2. Review AWS documentation for SageMaker
3. Consult project documentation at `/docs`
