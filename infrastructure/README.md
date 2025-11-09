# Infrastructure

AWS CDK infrastructure for Location Detection AI.

## Prerequisites

- Node.js 18+
- AWS CLI configured
- AWS account with CDK bootstrap completed

## Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your AWS account details
nano .env
```

## Deployment

```bash
# Deploy to development
export AWS_ACCOUNT_ID=placeholder-account
export AWS_REGION=us-east-1
export ENVIRONMENT=development
./scripts/deploy.sh

# Deploy to production
ENVIRONMENT=production ./scripts/deploy.sh
```

## Development

```bash
# Build TypeScript
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format

# Synthesize CloudFormation
npm run synth

# View differences
npm run diff
```

## Stack Structure

- `BaseInfrastructureStack` - KMS keys, IAM roles, networking foundation

## Testing Infrastructure

```bash
# Run unit tests
npm test

# Test synthesis
npm run synth

# Dry-run deployment
npm run diff
```
