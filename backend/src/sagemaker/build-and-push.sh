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
