# ML Lambda Docker Container Issue - Technical Report

## Issue Summary

**Status:** BLOCKED - ML inference Lambda function failing with `Runtime.InvalidEntrypoint` error
**Date:** 2025-11-08
**Job ID Affected:** 215c9ff2-332a-4f63-8241-e072f8925225

## Current Architecture

```
User Upload → S3 (blueprints/)
    ↓ S3 Event Notification
InferenceTrigger Lambda (✅ WORKING)
    ↓ Async Invocation
ML Inference Lambda (❌ FAILING - Runtime.InvalidEntrypoint)
    ↓ (Should process image and save results)
S3 (results/)
```

## What's Working

1. ✅ **Frontend Upload** - Files successfully upload to S3
2. ✅ **S3 Event Notification** - Triggers InferenceTrigger Lambda
3. ✅ **InferenceTrigger Lambda** - Successfully receives events and invokes ML Lambda
4. ✅ **Docker Image Build & Push** - Image successfully built and pushed to ECR
5. ✅ **Lambda Configuration** - Command correctly set to `["lambda_handler.handler"]`

## What's Failing

❌ **ML Inference Lambda Execution** - Container fails to start with:
```
Runtime.InvalidEntrypoint
Error: ProcessSpawnFailed
```

## Technical Details

### Docker Image
- **Registry:** `971422717446.dkr.ecr.us-east-2.amazonaws.com/location-detector:latest`
- **Current Digest:** `sha256:f42c6aadc4384e5655fc57afb39186bfc0e5d6a4843b6dd8b92c99eb6dc4bff0`
- **Base Image:** `public.ecr.aws/lambda/python:3.9`
- **Handler Location:** `/var/task/lambda_handler.py`
- **Function Name:** `handler`

### Lambda Configuration
```json
{
  "PackageType": "Image",
  "ImageConfigResponse": {
    "ImageConfig": {
      "Command": ["lambda_handler.handler"]
    }
  },
  "Environment": {
    "Variables": {
      "RESULTS_BUCKET_NAME": "location-detection-results-development"
    }
  },
  "Timeout": 300,
  "MemorySize": 3008
}
```

### Dockerfile (Current)
```dockerfile
FROM public.ecr.aws/lambda/python:3.9

# Install Python dependencies
COPY requirements.txt ${LAMBDA_TASK_ROOT}/
RUN pip install --no-cache-dir -r ${LAMBDA_TASK_ROOT}/requirements.txt

# Copy detector module and handler
COPY detector/ ${LAMBDA_TASK_ROOT}/detector/
COPY lambda_handler.py ${LAMBDA_TASK_ROOT}/lambda_handler.py

# Note: Handler is configured in CDK, not in Dockerfile
```

### Lambda Handler (lambda_handler.py)
```python
def handler(event, context):
    """
    Lambda handler for ML inference.
    Expected event format: {bucket, key, jobId, timestamp}
    """
    # Download image from S3
    # Run OpenCV room detection
    # Save results to S3 results bucket
```

## Troubleshooting Attempts

### Attempt 1: Fixed InferenceTrigger Handler Path
- **Issue:** TypeScript compiled to `dist/index.js` but handler pointed to `index.handler`
- **Fix:** Changed to `dist/index.handler`
- **Result:** ✅ InferenceTrigger now works

### Attempt 2: Environment Variables
- **Issue:** Results bucket name was hardcoded
- **Fix:** Added `RESULTS_BUCKET_NAME` environment variable
- **Result:** ✅ Config correct, but entrypoint still fails

### Attempt 3: Dockerfile CMD Configuration
- **Attempt A:** Added `CMD ["lambda_handler.handler"]` in Dockerfile
- **Result:** ❌ Still failed - AWS Lambda runtime rejected CMD
- **Attempt B:** Removed CMD, configured via CDK `cmd` parameter
- **Result:** ✅ Config applied correctly, but entrypoint still fails

### Attempt 4: Rebuilt Docker Image Without Cache
- **Action:** `docker build --no-cache` to ensure fresh build
- **Result:** ❌ New image pushed, same error

### Attempt 5: Updated Lambda Configuration via CDK
- **Action:** Deployed Lambda stack with `cmd: ['lambda_handler.handler']` in CDK
- **Result:** ✅ Configuration applied, but runtime still can't find handler

## Error Analysis

### CloudWatch Logs
```
INIT_REPORT Init Duration: 9.09 ms Phase: init Status: error Error Type: Runtime.InvalidEntrypoint
INIT_REPORT Init Duration: 3.47 ms Phase: invoke Status: error Error Type: Runtime.InvalidEntrypoint
```

The error occurs during INIT phase, meaning:
1. Lambda runtime starts the container
2. Runtime attempts to load the handler module
3. **Something fails** before the handler function is ever called

### Possible Root Causes

1. **Python Import Path Issue**
   - Lambda runtime can't import `lambda_handler` module
   - Python path doesn't include `/var/task`
   - Module name conflict

2. **Handler Function Name**
   - Function might need to be named differently
   - AWS expects specific naming conventions

3. **Dependencies Missing**
   - OpenCV or other dependencies failing to load
   - Native library issues (less likely with headless OpenCV)

4. **Base Image Incompatibility**
   - AWS Lambda Python 3.9 base image might have specific requirements
   - ENTRYPOINT/CMD interaction issues

## Recommended Solutions

### Option 1: Test Locally with Lambda Runtime Interface Emulator
```bash
docker run -p 9000:8080 location-detector:latest lambda_handler.handler
curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" -d '{}'
```
This would reveal the exact error message.

### Option 2: Simplify to Minimal Handler
Create minimal test handler to isolate the issue:
```python
def handler(event, context):
    return {"statusCode": 200, "body": "Hello from Lambda"}
```

### Option 3: Switch to Lambda Layer Deployment
Instead of Docker container:
1. Package OpenCV as Lambda Layer
2. Deploy Python code as zip file
3. Use standard Lambda runtime (not container)

### Option 4: Use Different Base Image
Try AWS-provided Python base images or build custom runtime.

## Current Deployment State

### Infrastructure (All Deployed ✅)
- LocDetAI-Dev-Base
- LocDetAI-Dev-Storage
- LocDetAI-Dev-Lambda
- LocDetAI-Dev-Api

### API Endpoint
```
https://bqufb8be9k.execute-api.us-east-2.amazonaws.com
```

### S3 Buckets
- Blueprints: `location-detection-blueprints-development`
- Results: `location-detection-results-development`

### Lambda Functions
1. **UploadHandler** - ✅ Working
2. **StatusHandler** - ✅ Working
3. **InferenceTrigger** - ✅ Working
4. **MLInferenceHandler** - ❌ Failing (Runtime.InvalidEntrypoint)

## Files Modified in This Session

1. `infrastructure/lib/lambda-stack.ts` - Added `cmd` parameter to Docker image config
2. `backend/src/lambdas/inference-trigger/index.ts` - Fixed handler path to `dist/index.handler`
3. `backend/src/sagemaker/lambda_handler.py` - Updated to use environment variables
4. `backend/src/sagemaker/Dockerfile` - Removed CMD directive
5. `frontend/.env` - Added API Gateway URL

## Next Steps

1. **Test Docker container locally** with Lambda Runtime Interface Emulator
2. **Add detailed logging** to lambda_handler.py to see initialization errors
3. **Try minimal handler** to isolate if issue is with OpenCV dependencies
4. **Consider switching** to Lambda Layer deployment instead of container
5. **Check AWS Lambda Python container documentation** for any missing requirements

## Test Job Details

**Job ID:** 215c9ff2-332a-4f63-8241-e072f8925225
**S3 Key:** `blueprints/215c9ff2-332a-4f63-8241-e072f8925225.jpg`
**File Size:** 170,011 bytes
**Status:** Processing (stuck forever - ML Lambda never completes)

## Contact & Resources

- AWS Lambda Container Image Docs: https://docs.aws.amazon.com/lambda/latest/dg/images-create.html
- AWS Lambda Python Base Images: https://gallery.ecr.aws/lambda/python
- Lambda Runtime Interface Emulator: https://github.com/aws/aws-lambda-runtime-interface-emulator
