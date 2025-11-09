# Location Detection AI - Deployment Guide

## Table of Contents
- [Prerequisites](#prerequisites)
- [Backend Deployment](#backend-deployment)
- [Frontend Deployment](#frontend-deployment)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Tools
- **AWS Account** with administrative permissions
- **Node.js** 18+ and npm 9+
- **Python** 3.9+
- **Docker** 20.10+ installed and running
- **AWS CLI** v2 configured with credentials
- **CDK** v2 installed globally: `npm install -g aws-cdk`

### AWS Permissions Required
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:*",
        "lambda:*",
        "apigateway:*",
        "sagemaker:*",
        "ecr:*",
        "iam:*",
        "cloudformation:*",
        "cloudwatch:*",
        "sns:*",
        "sqs:*"
      ],
      "Resource": "*"
    }
  ]
}
```

### Environment Variables
Create `.env` files in both frontend and backend:

**Frontend `.env.production`:**
```bash
VITE_API_GATEWAY_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/prod
VITE_APP_NAME=Location Detection AI
VITE_MAX_FILE_SIZE=10485760
```

**Backend `.env`:**
```bash
AWS_REGION=us-east-1
ENVIRONMENT=production
S3_BLUEPRINTS_BUCKET=location-detection-blueprints-prod
S3_RESULTS_BUCKET=location-detection-results-prod
SAGEMAKER_ENDPOINT_NAME=location-detector-prod
LOG_LEVEL=INFO
```

## Backend Deployment

### Step 1: Build and Push Docker Image

```bash
# Navigate to backend directory
cd backend/src/sagemaker

# Set environment variables
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION=us-east-1
export IMAGE_TAG=latest

# Login to ECR
aws ecr get-login-password --region ${AWS_REGION} | \
  docker login --username AWS --password-stdin \
  ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Create ECR repository if it doesn't exist
aws ecr create-repository \
  --repository-name location-detector \
  --region ${AWS_REGION} \
  --image-scanning-configuration scanOnPush=true \
  || echo "Repository already exists"

# Build Docker image
docker build -t location-detector:${IMAGE_TAG} .

# Tag image for ECR
docker tag location-detector:${IMAGE_TAG} \
  ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/location-detector:${IMAGE_TAG}

# Push to ECR
docker push \
  ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/location-detector:${IMAGE_TAG}
```

### Step 2: Deploy Infrastructure with CDK

```bash
# Navigate to infrastructure directory
cd infrastructure

# Install dependencies
npm install

# Bootstrap CDK (first time only)
cdk bootstrap aws://${AWS_ACCOUNT_ID}/${AWS_REGION}

# Synthesize CloudFormation template
cdk synth

# Deploy all stacks
cdk deploy --all --require-approval never

# Or deploy individually
cdk deploy StorageStack
cdk deploy SageMakerStack
cdk deploy LambdaStack
cdk deploy ApiGatewayStack
```

### Step 3: Verify Backend Deployment

```bash
# Get API Gateway URL
export API_URL=$(aws cloudformation describe-stacks \
  --stack-name ApiGatewayStack \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text)

echo "API URL: ${API_URL}"

# Test health endpoint
curl ${API_URL}/health

# Upload test blueprint
aws s3 cp tests/fixtures/sample-blueprint.png \
  s3://location-detection-blueprints-prod/test/sample.png

# Check SageMaker endpoint status
aws sagemaker describe-endpoint \
  --endpoint-name location-detector-prod
```

### Step 4: Monitor Backend Logs

```bash
# SageMaker endpoint logs
aws logs tail /aws/sagemaker/Endpoints/location-detector-prod --follow

# Lambda function logs
aws logs tail /aws/lambda/location-detection-handler --follow

# API Gateway logs
aws logs tail /aws/apigateway/location-detection-api --follow
```

## Frontend Deployment

### Option 1: AWS Amplify (Recommended)

```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Initialize Amplify
cd frontend
amplify init

# Add hosting
amplify add hosting

# Choose: Hosting with Amplify Console
# Choose: Manual deployment

# Publish
amplify publish
```

### Option 2: S3 + CloudFront

#### Step 1: Build Frontend

```bash
cd frontend

# Install dependencies
npm install

# Build for production
npm run build

# Output will be in dist/ directory
```

#### Step 2: Create S3 Bucket

```bash
# Create bucket
export BUCKET_NAME=location-detection-frontend-prod
aws s3 mb s3://${BUCKET_NAME}

# Enable static website hosting
aws s3 website s3://${BUCKET_NAME} \
  --index-document index.html \
  --error-document index.html

# Upload build files
aws s3 sync dist/ s3://${BUCKET_NAME} \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "*.html" \
  --exclude "*.json"

# Upload HTML files with shorter cache
aws s3 sync dist/ s3://${BUCKET_NAME} \
  --delete \
  --cache-control "public, max-age=0, must-revalidate" \
  --exclude "*" \
  --include "*.html" \
  --include "*.json"
```

#### Step 3: Create CloudFront Distribution

```bash
# Create CloudFront distribution (via AWS Console or CLI)
aws cloudfront create-distribution \
  --origin-domain-name ${BUCKET_NAME}.s3.amazonaws.com \
  --default-root-object index.html

# Get distribution ID
export DISTRIBUTION_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Origins.Items[?DomainName=='${BUCKET_NAME}.s3.amazonaws.com']].Id" \
  --output text)

# Update index.html for SPA routing
aws cloudfront create-invalidation \
  --distribution-id ${DISTRIBUTION_ID} \
  --paths "/*"
```

#### Step 4: Configure Custom Domain (Optional)

```bash
# Request SSL certificate in ACM (us-east-1 for CloudFront)
aws acm request-certificate \
  --domain-name location-detection.example.com \
  --validation-method DNS \
  --region us-east-1

# Add CNAME record to Route53 or your DNS provider
# Update CloudFront distribution with custom domain
```

### Option 3: Docker Container (ECS/Fargate)

```bash
# Build production image
cd frontend
docker build -t location-detection-frontend:latest .

# Push to ECR
aws ecr create-repository --repository-name location-detection-frontend
docker tag location-detection-frontend:latest \
  ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/location-detection-frontend:latest

docker push \
  ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/location-detection-frontend:latest

# Deploy to ECS Fargate
aws ecs create-cluster --cluster-name location-detection-cluster
# Follow ECS deployment guide...
```

## Monitoring and Maintenance

### CloudWatch Dashboards

Create custom dashboard:

```bash
aws cloudwatch put-dashboard \
  --dashboard-name LocationDetectionDashboard \
  --dashboard-body file://cloudwatch-dashboard.json
```

**cloudwatch-dashboard.json:**
```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/Lambda", "Invocations", {"stat": "Sum"}],
          [".", "Errors", {"stat": "Sum"}],
          [".", "Duration", {"stat": "Average"}]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "Lambda Metrics"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/SageMaker", "ModelLatency"],
          [".", "Invocations"]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "SageMaker Endpoint"
      }
    }
  ]
}
```

### Alarms

```bash
# Create CloudWatch alarms
aws cloudwatch put-metric-alarm \
  --alarm-name high-lambda-errors \
  --alarm-description "Lambda error rate too high" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:${AWS_ACCOUNT_ID}:alerts

aws cloudwatch put-metric-alarm \
  --alarm-name high-sagemaker-latency \
  --alarm-description "SageMaker latency too high" \
  --metric-name ModelLatency \
  --namespace AWS/SageMaker \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 5000 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:${AWS_ACCOUNT_ID}:alerts
```

### Cost Optimization

#### S3 Lifecycle Policies

```bash
# Apply lifecycle policy to blueprints bucket
aws s3api put-bucket-lifecycle-configuration \
  --bucket location-detection-blueprints-prod \
  --lifecycle-configuration file://lifecycle-policy.json
```

**lifecycle-policy.json:**
```json
{
  "Rules": [
    {
      "Id": "DeleteOldBlueprints",
      "Status": "Enabled",
      "Prefix": "",
      "Expiration": {
        "Days": 30
      }
    },
    {
      "Id": "TransitionToIA",
      "Status": "Enabled",
      "Prefix": "results/",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "INTELLIGENT_TIERING"
        }
      ]
    }
  ]
}
```

#### SageMaker Auto-scaling

```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace sagemaker \
  --resource-id endpoint/location-detector-prod/variant/AllTraffic \
  --scalable-dimension sagemaker:variant:DesiredInstanceCount \
  --min-capacity 1 \
  --max-capacity 5

# Create scaling policy
aws application-autoscaling put-scaling-policy \
  --policy-name sagemaker-scaling-policy \
  --service-namespace sagemaker \
  --resource-id endpoint/location-detector-prod/variant/AllTraffic \
  --scalable-dimension sagemaker:variant:DesiredInstanceCount \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration file://scaling-policy.json
```

### Backup and Disaster Recovery

```bash
# Enable versioning on S3 buckets
aws s3api put-bucket-versioning \
  --bucket location-detection-results-prod \
  --versioning-configuration Status=Enabled

# Enable cross-region replication
aws s3api put-bucket-replication \
  --bucket location-detection-results-prod \
  --replication-configuration file://replication-config.json

# Create snapshots of infrastructure
aws cloudformation create-change-set \
  --stack-name LocationDetectionStack \
  --change-set-name backup-$(date +%Y%m%d) \
  --template-body file://template.yaml
```

## CI/CD Pipeline

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  AWS_REGION: us-east-1
  NODE_VERSION: '18'
  PYTHON_VERSION: '3.9'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install frontend dependencies
        run: cd frontend && npm ci

      - name: Run frontend tests
        run: cd frontend && npm run test:coverage

      - name: Run E2E tests
        run: cd frontend && npx playwright test

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: ${{ env.PYTHON_VERSION }}

      - name: Install backend dependencies
        run: cd backend && pip install -r requirements.txt

      - name: Run backend tests
        run: cd backend && pytest --cov

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build and push Docker image
        run: |
          cd backend/src/sagemaker
          docker build -t location-detector:${{ github.sha }} .
          docker tag location-detector:${{ github.sha }} \
            ${{ steps.login-ecr.outputs.registry }}/location-detector:latest
          docker push ${{ steps.login-ecr.outputs.registry }}/location-detector:latest

      - name: Deploy CDK stacks
        run: |
          cd infrastructure
          npm ci
          npx cdk deploy --all --require-approval never

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install dependencies
        run: cd frontend && npm ci

      - name: Build frontend
        run: cd frontend && npm run build
        env:
          VITE_API_GATEWAY_URL: ${{ secrets.API_GATEWAY_URL }}

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Deploy to S3
        run: |
          aws s3 sync frontend/dist/ s3://location-detection-frontend-prod \
            --delete --cache-control "public, max-age=31536000"

      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/*"
```

## Rollback Procedures

### Backend Rollback

```bash
# Rollback CDK stack to previous version
cdk deploy --previous

# Or manually update endpoint to previous model
aws sagemaker update-endpoint \
  --endpoint-name location-detector-prod \
  --endpoint-config-name location-detector-prod-v1
```

### Frontend Rollback

```bash
# Get previous version from S3 versioning
aws s3api list-object-versions \
  --bucket location-detection-frontend-prod \
  --prefix index.html

# Restore previous version
aws s3api copy-object \
  --copy-source location-detection-frontend-prod/index.html?versionId=VERSION_ID \
  --bucket location-detection-frontend-prod \
  --key index.html

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id ${DISTRIBUTION_ID} \
  --paths "/*"
```

## Security Checklist

- [ ] All S3 buckets have encryption enabled
- [ ] CloudFront uses HTTPS only
- [ ] API Gateway has WAF rules configured
- [ ] Lambda functions use least-privilege IAM roles
- [ ] Secrets stored in AWS Secrets Manager
- [ ] VPC endpoints configured for private communication
- [ ] CloudTrail logging enabled
- [ ] GuardDuty enabled for threat detection
- [ ] Security groups follow principle of least privilege
- [ ] Regular security patches applied

## Performance Tuning

### Lambda Optimization
```bash
# Increase memory (also increases CPU)
aws lambda update-function-configuration \
  --function-name location-detection-handler \
  --memory-size 2048 \
  --timeout 300

# Enable provisioned concurrency
aws lambda put-provisioned-concurrency-config \
  --function-name location-detection-handler \
  --provisioned-concurrent-executions 5 \
  --qualifier LATEST
```

### SageMaker Optimization
```bash
# Use accelerated computing instances
aws sagemaker create-endpoint-config \
  --endpoint-config-name location-detector-gpu \
  --production-variants \
    VariantName=AllTraffic,ModelName=location-detector,InstanceType=ml.g4dn.xlarge,InitialInstanceCount=1
```

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues and solutions.

## Support and Resources

- **Documentation**: `/docs`
- **API Reference**: [API.md](./API.md)
- **Architecture Diagram**: `/docs/architecture.png`
- **AWS Support**: https://aws.amazon.com/support
- **GitHub Issues**: https://github.com/your-org/location-detection-ai/issues

---

**Last Updated**: 2025-11-07
**Version**: 1.0.0
