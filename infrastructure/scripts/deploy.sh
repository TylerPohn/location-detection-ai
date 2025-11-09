#!/bin/bash
set -e

# Source environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Validate required variables
if [ -z "$AWS_ACCOUNT_ID" ]; then
  echo "Error: AWS_ACCOUNT_ID is not set"
  exit 1
fi

if [ -z "$AWS_REGION" ]; then
  echo "Warning: AWS_REGION not set, using default us-east-1"
  export AWS_REGION=us-east-1
fi

# Bootstrap CDK (first time only)
echo "Bootstrapping CDK..."
npx cdk bootstrap aws://$AWS_ACCOUNT_ID/$AWS_REGION

# Build TypeScript
echo "Building TypeScript..."
npm run build

# Synthesize CloudFormation
echo "Synthesizing CloudFormation templates..."
npm run synth

# Deploy stacks
echo "Deploying infrastructure..."
npm run deploy -- --require-approval never

echo "Deployment complete!"
