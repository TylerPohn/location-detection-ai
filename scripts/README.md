# Backend Deployment Scripts

## ⚠️ SECURITY WARNING

**These scripts contain AWS credentials and are gitignored. DO NOT commit them to version control.**

## Quick Deploy

To deploy the entire backend infrastructure:

```bash
./scripts/deploy-backend.sh
```

This single script handles everything:
1. ✅ Builds inference-trigger Lambda (TypeScript → JavaScript)
2. ✅ Builds Docker image for SageMaker
3. ✅ Pushes Docker image to ECR
4. ✅ Bootstraps CDK (if needed)
5. ✅ Deploys all 5 CloudFormation stacks:
   - Base Stack (KMS, IAM)
   - Storage Stack (S3 buckets)
   - SageMaker Stack (ML endpoint)
   - Lambda Stack (3 functions)
   - API Gateway Stack (HTTP API)

## Prerequisites

### Required Software
- Docker Desktop running
- Node.js 18+
- AWS CLI v2
- npm

### AWS Configuration
The script uses embedded credentials from `.env`:
- Account: 971422717446
- Region: us-east-2
- Environment: development

## Deployment Time

**Expected Duration: 10-15 minutes**

Breakdown:
- Lambda build: ~30 seconds
- Docker build + push: ~3-5 minutes
- CDK bootstrap (first time): ~2 minutes
- Stack deployment: ~8-10 minutes
  - Base: ~2 minutes
  - Storage: ~1 minute
  - SageMaker: ~5-7 minutes (endpoint creation is slow)
  - Lambda: ~2 minutes
  - API Gateway: ~1 minute

## What Gets Deployed

### Infrastructure Created

1. **S3 Buckets** (2)
   - `location-detection-blueprints-development`
   - `location-detection-results-development`

2. **Lambda Functions** (3)
   - Upload Handler (generates pre-signed URLs)
   - Status Handler (checks job status)
   - Inference Trigger (triggers SageMaker on S3 upload)

3. **SageMaker Endpoint** (1)
   - Instance: ml.m5.xlarge
   - Async inference with SNS notifications

4. **API Gateway** (1)
   - HTTP API with CORS
   - POST /upload
   - GET /status/{jobId}

5. **IAM Roles** (2)
   - Service role for Lambda
   - Execution role for SageMaker

6. **KMS Key** (1)
   - Encryption for S3 buckets

### Outputs

After deployment, check `infrastructure/cdk-outputs.json` for:
- API Gateway endpoint URL
- S3 bucket names
- SageMaker endpoint name
- IAM role ARNs

## Post-Deployment

### 1. Get API Endpoint

```bash
cat infrastructure/cdk-outputs.json | grep ApiEndpoint
```

### 2. Update Frontend

Copy the API endpoint to `frontend/.env`:

```bash
VITE_API_GATEWAY_URL=https://xxxxx.execute-api.us-east-2.amazonaws.com
```

### 3. Test API

```bash
# Test upload endpoint
curl -X POST https://YOUR-API-ENDPOINT/upload \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "test.png",
    "fileType": "image/png",
    "fileSize": 1024000
  }'

# Response should include jobId and uploadUrl
```

## Troubleshooting

### Docker Build Fails

```bash
# Ensure Docker is running
docker ps

# Try building manually
cd backend/src/sagemaker
docker build -t location-detector:latest .
```

### Lambda Build Fails

```bash
# Build manually
cd backend/src/lambdas/inference-trigger
npm install
npm run build
ls -la dist/index.js  # Should exist
```

### CDK Deploy Fails

```bash
# Check AWS credentials
aws sts get-caller-identity

# Verify account and region
aws configure list

# Try manual deploy
cd infrastructure
npm install
npx cdk synth  # Should succeed
npx cdk deploy --all
```

### SageMaker Endpoint Stuck

SageMaker endpoint creation is the slowest part (5-7 minutes). Monitor:

```bash
aws sagemaker describe-endpoint \
  --endpoint-name location-detector-development \
  --region us-east-2
```

Status will be: Creating → InService

## Cost Estimation

### Monthly Costs (Development)

- **SageMaker ml.m5.xlarge**: ~$150/month (if running 24/7)
  - Consider stopping when not in use
- **Lambda**: ~$0-5/month (low usage)
- **S3**: ~$1-5/month (depends on storage)
- **API Gateway**: ~$1/month (low usage)
- **Data transfer**: ~$1-5/month

**Total: ~$153-166/month**

### Cost Optimization

Stop SageMaker endpoint when not in use:

```bash
aws sagemaker delete-endpoint \
  --endpoint-name location-detector-development \
  --region us-east-2
```

Redeploy when needed:

```bash
cd infrastructure
npx cdk deploy LocDetAI-Dev-SageMaker
```

## Cleanup

To destroy all infrastructure:

```bash
cd infrastructure
npx cdk destroy --all
```

**WARNING**: This will delete:
- All S3 buckets (blueprints and results preserved due to RETAIN policy)
- All Lambda functions
- SageMaker endpoint
- API Gateway

## Security Notes

1. **Credentials**: Never commit `scripts/deploy-backend.sh`
2. **API CORS**: Update CORS origins in production
3. **S3 Buckets**: Currently allow all origins - restrict in production
4. **KMS Keys**: Set to RETAIN to prevent accidental deletion

## Support

For issues:
1. Check CloudWatch Logs for Lambda errors
2. Check SageMaker logs in CloudWatch
3. Verify IAM permissions
4. Review `docs/TROUBLESHOOTING.md`
