# PR-5: SageMaker Async Inference Setup

## Overview
Deploy the OpenCV detector to AWS SageMaker Async Inference endpoint for scalable, serverless blueprint processing with automatic queue management.

## Dependencies
**Requires:**
- PR-2 (AWS CDK Infrastructure)
- PR-4 (OpenCV Detector Implementation)

## Objectives
- Package OpenCV detector as SageMaker model
- Create Docker container with inference script
- Deploy SageMaker Async Inference endpoint using CDK
- Configure S3 input/output paths and SNS notifications
- Create Lambda trigger for S3 upload events
- Implement retry logic and error handling

## Detailed Steps

### 1. Create SageMaker Inference Script
**Estimated Time:** 40 minutes

```python
# backend/src/sagemaker/inference.py
import json
import os
import cv2
import numpy as np
import boto3
from pathlib import Path

# Import detector from local module
from detector.opencv_detector import OpenCVDetector

def model_fn(model_dir):
    """
    Load the model. SageMaker calls this once when container starts.

    Args:
        model_dir: Path to model artifacts

    Returns:
        Detector instance
    """
    # Read configuration if exists
    config_path = Path(model_dir) / 'config.json'
    if config_path.exists():
        with open(config_path) as f:
            config = json.load(f)
    else:
        config = {}

    # Initialize detector with config
    detector = OpenCVDetector(
        min_area=config.get('min_area', 1000),
        max_area=config.get('max_area', 1000000),
        epsilon_factor=config.get('epsilon_factor', 0.01)
    )

    return detector

def input_fn(request_body, content_type):
    """
    Deserialize input data.

    Args:
        request_body: Request body bytes
        content_type: Content type string

    Returns:
        Processed input for prediction
    """
    if content_type == 'application/json':
        # JSON format with S3 path
        input_data = json.loads(request_body)

        s3_client = boto3.client('s3')
        bucket = input_data['bucket']
        key = input_data['key']

        # Download image from S3
        response = s3_client.get_object(Bucket=bucket, Key=key)
        image_bytes = response['Body'].read()

        # Decode image
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        return {
            'image': image,
            'metadata': input_data.get('metadata', {})
        }

    elif content_type in ['image/png', 'image/jpeg']:
        # Direct image bytes
        nparr = np.frombuffer(request_body, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        return {
            'image': image,
            'metadata': {}
        }

    else:
        raise ValueError(f"Unsupported content type: {content_type}")

def predict_fn(input_data, model):
    """
    Run inference.

    Args:
        input_data: Preprocessed input from input_fn
        model: Model from model_fn

    Returns:
        Prediction results
    """
    image = input_data['image']
    metadata = input_data['metadata']

    if image is None:
        raise ValueError("Failed to decode image")

    # Run detection
    rooms = model.detect_rooms(image)

    # Prepare result
    result = {
        'status': 'success',
        'room_count': len(rooms),
        'rooms': rooms,
        'image_shape': list(image.shape),
        'metadata': metadata
    }

    return result

def output_fn(prediction, accept_type):
    """
    Serialize prediction output.

    Args:
        prediction: Prediction from predict_fn
        accept_type: Requested output format

    Returns:
        Serialized output
    """
    if accept_type == 'application/json':
        return json.dumps(prediction), accept_type
    else:
        raise ValueError(f"Unsupported accept type: {accept_type}")
```

**Verification:** Run Python syntax check: `python -m py_compile inference.py`.

### 2. Create Dockerfile for SageMaker Container
**Estimated Time:** 45 minutes

```dockerfile
# backend/src/sagemaker/Dockerfile
FROM python:3.9-slim

# Install system dependencies for OpenCV
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /opt/ml/code

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy detector module
COPY detector/ ./detector/

# Copy inference script
COPY inference.py .

# Set environment variables for SageMaker
ENV SAGEMAKER_PROGRAM inference.py
ENV SAGEMAKER_SUBMIT_DIRECTORY /opt/ml/code

# SageMaker serves on port 8080
EXPOSE 8080

# Entry point (SageMaker will override this)
ENTRYPOINT ["python", "inference.py"]
```

Create requirements.txt:

```txt
# backend/src/sagemaker/requirements.txt
opencv-python-headless==4.8.0.76
numpy==1.24.3
boto3==1.28.25
sagemaker-inference==1.9.0
```

**Verification:** Build Docker image: `docker build -t location-detector:test .`.

### 3. Build and Push Container to ECR
**Estimated Time:** 30 minutes

```bash
# backend/src/sagemaker/build-and-push.sh
#!/bin/bash
set -e

# Configuration
AWS_REGION=${AWS_REGION:-us-east-1}
AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID}
IMAGE_NAME="location-detector"
IMAGE_TAG=${IMAGE_TAG:-latest}

if [ -z "$AWS_ACCOUNT_ID" ]; then
  echo "Error: AWS_ACCOUNT_ID environment variable is required"
  exit 1
fi

# ECR repository name
ECR_REPO="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${IMAGE_NAME}"

echo "Building Docker image..."
docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .

echo "Tagging image for ECR..."
docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${ECR_REPO}:${IMAGE_TAG}

echo "Logging into ECR..."
aws ecr get-login-password --region ${AWS_REGION} | \
  docker login --username AWS --password-stdin ${ECR_REPO}

# Create ECR repository if it doesn't exist
echo "Creating ECR repository if needed..."
aws ecr describe-repositories --repository-names ${IMAGE_NAME} --region ${AWS_REGION} || \
  aws ecr create-repository --repository-name ${IMAGE_NAME} --region ${AWS_REGION}

echo "Pushing image to ECR..."
docker push ${ECR_REPO}:${IMAGE_TAG}

echo "Image pushed successfully: ${ECR_REPO}:${IMAGE_TAG}"
echo "Use this image URI in your SageMaker endpoint configuration"
```

Make executable:

```bash
chmod +x build-and-push.sh
```

**Verification:** Run script to build and push: `./build-and-push.sh`.

### 4. Create SageMaker CDK Stack
**Estimated Time:** 50 minutes

```typescript
// infrastructure/lib/sagemaker-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as sagemaker from 'aws-cdk-lib/aws-sagemaker';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

export interface SageMakerStackProps extends cdk.StackProps {
  environmentName: string;
  blueprintBucket: s3.IBucket;
  resultsBucket: s3.IBucket;
  modelImageUri: string;
  serviceRole: iam.IRole;
}

export class SageMakerStack extends cdk.Stack {
  public readonly endpoint: sagemaker.CfnEndpoint;
  public readonly endpointConfigName: string;
  public readonly modelName: string;

  constructor(scope: Construct, id: string, props: SageMakerStackProps) {
    super(scope, id, props);

    // SNS topic for async inference notifications
    const notificationTopic = new sns.Topic(this, 'InferenceNotifications', {
      displayName: 'Location Detection Inference Notifications',
    });

    // SageMaker execution role
    const sagemakerRole = new iam.Role(this, 'SageMakerRole', {
      assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'),
      ],
    });

    // Grant S3 access
    props.blueprintBucket.grantRead(sagemakerRole);
    props.resultsBucket.grantWrite(sagemakerRole);

    // Grant SNS publish
    notificationTopic.grantPublish(sagemakerRole);

    // SageMaker Model
    this.modelName = `location-detector-${props.environmentName}`;

    const model = new sagemaker.CfnModel(this, 'DetectorModel', {
      modelName: this.modelName,
      executionRoleArn: sagemakerRole.roleArn,
      primaryContainer: {
        image: props.modelImageUri,
        mode: 'SingleModel',
        environment: {
          SAGEMAKER_PROGRAM: 'inference.py',
          SAGEMAKER_SUBMIT_DIRECTORY: '/opt/ml/code',
        },
      },
    });

    // Endpoint Configuration with Async Inference
    this.endpointConfigName = `location-detector-config-${props.environmentName}`;

    const endpointConfig = new sagemaker.CfnEndpointConfig(this, 'EndpointConfig', {
      endpointConfigName: this.endpointConfigName,
      productionVariants: [
        {
          modelName: model.modelName!,
          variantName: 'AllTraffic',
          initialInstanceCount: 1,
          instanceType: 'ml.m5.xlarge',
        },
      ],
      asyncInferenceConfig: {
        outputConfig: {
          s3OutputPath: `s3://${props.resultsBucket.bucketName}/sagemaker-output/`,
          notificationConfig: {
            successTopic: notificationTopic.topicArn,
            errorTopic: notificationTopic.topicArn,
          },
        },
        clientConfig: {
          maxConcurrentInvocationsPerInstance: 4,
        },
      },
    });

    endpointConfig.addDependency(model);

    // SageMaker Endpoint
    const endpointName = `location-detector-${props.environmentName}`;

    this.endpoint = new sagemaker.CfnEndpoint(this, 'Endpoint', {
      endpointName: endpointName,
      endpointConfigName: endpointConfig.endpointConfigName!,
    });

    this.endpoint.addDependency(endpointConfig);

    // Outputs
    new cdk.CfnOutput(this, 'EndpointName', {
      value: this.endpoint.endpointName!,
      description: 'SageMaker endpoint name',
    });

    new cdk.CfnOutput(this, 'NotificationTopicArn', {
      value: notificationTopic.topicArn,
      description: 'SNS topic for inference notifications',
    });

    // Tags
    cdk.Tags.of(this).add('Project', 'LocationDetectionAI');
    cdk.Tags.of(this).add('Environment', props.environmentName);
  }
}
```

**Verification:** Run `npm run build` and `npm run synth`.

### 5. Create S3 Event Trigger Lambda
**Estimated Time:** 40 minutes

```typescript
// backend/src/lambdas/inference-trigger/index.ts
import { S3Event } from 'aws-lambda';
import { SageMakerRuntimeClient, InvokeEndpointAsyncCommand } from '@aws-sdk/client-sagemaker-runtime';

const sagemakerClient = new SageMakerRuntimeClient({ region: process.env.AWS_REGION });
const ENDPOINT_NAME = process.env.SAGEMAKER_ENDPOINT_NAME!;
const RESULTS_BUCKET = process.env.RESULTS_BUCKET_NAME!;

export const handler = async (event: S3Event): Promise<void> => {
  console.log('S3 event received:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    // Only process blueprint uploads
    if (!key.startsWith('blueprints/')) {
      console.log(`Skipping non-blueprint file: ${key}`);
      continue;
    }

    // Extract job ID from key
    const jobId = key.split('/')[1].split('.')[0];

    console.log(`Triggering inference for job ${jobId}: s3://${bucket}/${key}`);

    try {
      // Prepare input payload
      const inputPayload = {
        bucket: bucket,
        key: key,
        metadata: {
          jobId: jobId,
          timestamp: new Date().toISOString(),
        },
      };

      // Invoke SageMaker Async Endpoint
      const command = new InvokeEndpointAsyncCommand({
        EndpointName: ENDPOINT_NAME,
        InputLocation: `s3://${bucket}/${key}`,
        ContentType: 'application/json',
        Accept: 'application/json',
        InferenceId: jobId,
      });

      const response = await sagemakerClient.send(command);

      console.log(`Inference triggered successfully:`, response);
      console.log(`Output location: ${response.OutputLocation}`);
    } catch (error) {
      console.error(`Error triggering inference for ${jobId}:`, error);
      throw error;
    }
  }
};
```

**Verification:** Build Lambda TypeScript code.

### 6. Wire S3 Event Notification in CDK
**Estimated Time:** 30 minutes

```typescript
// infrastructure/lib/storage-stack.ts - Add to existing stack
import * as s3Notifications from 'aws-cdk-lib/aws-s3-notifications';
import * as lambda from 'aws-cdk-lib/aws-lambda';

// ... existing code ...

// In StorageStack constructor, add:
public addBlueprintUploadTrigger(triggerFunction: lambda.IFunction): void {
  this.blueprintBucket.addEventNotification(
    s3.EventType.OBJECT_CREATED,
    new s3Notifications.LambdaDestination(triggerFunction),
    { prefix: 'blueprints/' }
  );
}
```

Update Lambda stack:

```typescript
// infrastructure/lib/lambda-stack.ts - Add inference trigger
import * as path from 'path';

// ... existing code ...

// Add to LambdaStack:
public readonly inferenceTrigger: lambda.Function;

constructor(scope: Construct, id: string, props: LambdaStackProps) {
  // ... existing code ...

  this.inferenceTrigger = new lambda.Function(this, 'InferenceTrigger', {
    runtime: lambda.Runtime.NODEJS_18_X,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(
      path.join(__dirname, '../../backend/src/lambdas/inference-trigger')
    ),
    role: props.serviceRole,
    environment: {
      SAGEMAKER_ENDPOINT_NAME: props.endpointName,
      RESULTS_BUCKET_NAME: props.resultsBucket.bucketName,
      AWS_REGION: this.region,
    },
    timeout: cdk.Duration.seconds(60),
    memorySize: 256,
  });

  // Grant SageMaker invoke permissions
  this.inferenceTrigger.addToRolePolicy(
    new iam.PolicyStatement({
      actions: ['sagemaker:InvokeEndpointAsync'],
      resources: [props.endpointArn],
    })
  );
}
```

**Verification:** Run `npm run synth` to validate all stacks.

### 7. Update Main CDK App
**Estimated Time:** 20 minutes

```typescript
// infrastructure/bin/infrastructure.ts - Add SageMaker stack
import { SageMakerStack } from '../lib/sagemaker-stack';

// ... existing code ...

// After Lambda stack:
const sagemakerStack = new SageMakerStack(app, `${config.stackPrefix}-SageMaker`, {
  env,
  environmentName: config.environment,
  blueprintBucket: storageStack.blueprintBucket,
  resultsBucket: storageStack.resultsBucket,
  modelImageUri: process.env.MODEL_IMAGE_URI || '', // Set from environment
  serviceRole: baseStack.serviceRole,
});
sagemakerStack.addDependency(storageStack);

// Update Lambda stack to include endpoint info
// Then add S3 trigger
storageStack.addBlueprintUploadTrigger(lambdaStack.inferenceTrigger);
```

**Verification:** Run `npm run build && npm run synth`.

### 8. Create Deployment Guide
**Estimated Time:** 25 minutes

```markdown
<!-- backend/src/sagemaker/README.md -->
# SageMaker Async Inference Deployment

## Prerequisites

- Docker installed locally
- AWS CLI configured with appropriate credentials
- ECR repository access
- SageMaker permissions

## Build and Deploy Steps

### 1. Build and Push Docker Image

```bash
cd backend/src/sagemaker

# Set environment variables
export AWS_ACCOUNT_ID=123456789012
export AWS_REGION=us-east-1
export IMAGE_TAG=latest

# Build and push to ECR
./build-and-push.sh
```

### 2. Deploy Infrastructure

```bash
cd infrastructure

# Set model image URI from previous step
export MODEL_IMAGE_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/location-detector:${IMAGE_TAG}"

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
```

## Monitoring

- CloudWatch Logs: `/aws/sagemaker/Endpoints/location-detector-dev`
- CloudWatch Metrics: SageMaker > Endpoints
- SNS Notifications: Subscribe to inference notification topic

## Troubleshooting

### Endpoint creation fails
- Check IAM role permissions
- Verify ECR image exists and is accessible
- Review CloudFormation events

### Inference times out
- Increase endpoint instance size
- Check image preprocessing complexity
- Review CloudWatch logs for errors

### No results in S3
- Verify S3 event notification is configured
- Check Lambda function execution
- Review SageMaker endpoint logs
```

**Verification:** Review documentation for completeness.

## Acceptance Criteria

- [ ] SageMaker inference script handles model loading and prediction
- [ ] Docker container builds successfully with all dependencies
- [ ] ECR repository created and image pushed
- [ ] SageMaker model, endpoint config, and endpoint created via CDK
- [ ] Async inference configured with S3 input/output
- [ ] SNS notifications set up for success/failure
- [ ] S3 event triggers Lambda on blueprint upload
- [ ] Lambda invokes SageMaker async endpoint
- [ ] Results written to S3 results bucket
- [ ] All CDK stacks synthesize without errors
- [ ] Deployment documentation complete

## Testing Instructions

```bash
# Build Docker image locally
cd backend/src/sagemaker
docker build -t location-detector:test .

# Test inference script locally
docker run -it location-detector:test python -c "from inference import model_fn; print('OK')"

# Deploy infrastructure
cd ../../../infrastructure
export MODEL_IMAGE_URI="<your-ecr-uri>"
npm run synth

# After deployment, test end-to-end
aws s3 cp sample-blueprint.png s3://your-blueprint-bucket/blueprints/test-job.png

# Wait 30-60 seconds and check results
aws s3 ls s3://your-results-bucket/sagemaker-output/
```

## Estimated Total Time
**5-6 hours** for a junior engineer following step-by-step.

## Next Steps
After PR-5 is merged, backend is complete. Frontend PRs can now fully integrate:
- **PR-8** (API Integration) - can now call real endpoints

## Notes for Junior Engineers

- **SageMaker Async is for long-running inference** - use for >30 second tasks
- **Docker image must be in ECR** - SageMaker can't pull from Docker Hub
- **Test locally first** - Docker allows local debugging before deployment
- **Async uses S3 for I/O** - input and output stored in S3
- **SNS notifies on completion** - subscribe to get alerts
- **Cold starts can be slow** - first invocation takes longer
- **Monitor costs** - SageMaker instances charge per hour
- **Read CloudWatch logs** - they contain detailed error messages
