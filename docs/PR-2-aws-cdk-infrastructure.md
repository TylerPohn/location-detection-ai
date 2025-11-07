# PR-2: AWS CDK Infrastructure Foundation

## Overview
Set up AWS Cloud Development Kit (CDK) project with TypeScript to define infrastructure as code for the Location Detection AI system.

## Dependencies
**Requires:** PR-1 (Project Foundation)

## Objectives
- Initialize AWS CDK project in TypeScript
- Configure AWS account and region settings
- Set up CDK app structure with stacks
- Create base constructs for networking and IAM
- Implement environment-based deployment configuration

## Detailed Steps

### 1. Install AWS CDK and Dependencies
**Estimated Time:** 20 minutes

```bash
cd infrastructure

# Initialize CDK project
npx aws-cdk init app --language=typescript

# Install additional dependencies
npm install @aws-cdk/aws-s3 @aws-cdk/aws-lambda @aws-cdk/aws-apigatewayv2 \
  @aws-cdk/aws-sagemaker @aws-cdk/aws-stepfunctions @aws-cdk/aws-iam \
  @aws-cdk/aws-logs @aws-cdk/aws-kms

# Install dev dependencies
npm install --save-dev @types/node @typescript-eslint/eslint-plugin \
  @typescript-eslint/parser eslint prettier
```

**Verification:** Run `npm run build` and confirm compilation succeeds.

### 2. Configure CDK Context and Environment
**Estimated Time:** 25 minutes

```typescript
// infrastructure/cdk.json - Update with environment-specific config
{
  "app": "npx ts-node --prefer-ts-exts bin/infrastructure.ts",
  "context": {
    "@aws-cdk/aws-lambda:recognizeLayerVersion": true,
    "@aws-cdk/core:checkSecretUsage": true,
    "@aws-cdk/core:target-partitions": ["aws"],
    "environments": {
      "development": {
        "account": "${AWS_ACCOUNT_ID}",
        "region": "us-east-1",
        "stackPrefix": "LocDetAI-Dev"
      },
      "production": {
        "account": "${AWS_ACCOUNT_ID}",
        "region": "us-east-1",
        "stackPrefix": "LocDetAI-Prod"
      }
    }
  }
}
```

Create environment configuration helper:

```typescript
// infrastructure/lib/config.ts
export interface EnvironmentConfig {
  account: string;
  region: string;
  environment: 'development' | 'production';
  stackPrefix: string;
}

export function getEnvironmentConfig(): EnvironmentConfig {
  const env = process.env.ENVIRONMENT || 'development';
  const accountId = process.env.AWS_ACCOUNT_ID;
  const region = process.env.AWS_REGION || 'us-east-1';

  if (!accountId) {
    throw new Error('AWS_ACCOUNT_ID environment variable is required');
  }

  return {
    account: accountId,
    region: region,
    environment: env as 'development' | 'production',
    stackPrefix: env === 'production' ? 'LocDetAI-Prod' : 'LocDetAI-Dev'
  };
}
```

**Verification:** Run `npx ts-node -e "import { getEnvironmentConfig } from './lib/config'; console.log(getEnvironmentConfig())"` with AWS_ACCOUNT_ID set.

### 3. Create Base Infrastructure Stack
**Estimated Time:** 30 minutes

```typescript
// infrastructure/lib/base-infrastructure-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';

export interface BaseInfrastructureStackProps extends cdk.StackProps {
  environmentName: string;
}

export class BaseInfrastructureStack extends cdk.Stack {
  public readonly encryptionKey: kms.Key;
  public readonly serviceRole: iam.Role;

  constructor(scope: Construct, id: string, props: BaseInfrastructureStackProps) {
    super(scope, id, props);

    // KMS encryption key for data at rest
    this.encryptionKey = new kms.Key(this, 'EncryptionKey', {
      description: `Location Detection AI ${props.environmentName} encryption key`,
      enableKeyRotation: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Service role for Lambda and SageMaker
    this.serviceRole = new iam.Role(this, 'ServiceRole', {
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal('lambda.amazonaws.com'),
        new iam.ServicePrincipal('sagemaker.amazonaws.com')
      ),
      description: 'Service role for Location Detection AI services',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Grant encryption key access to service role
    this.encryptionKey.grantEncryptDecrypt(this.serviceRole);

    // Outputs
    new cdk.CfnOutput(this, 'EncryptionKeyId', {
      value: this.encryptionKey.keyId,
      description: 'KMS encryption key ID',
    });

    new cdk.CfnOutput(this, 'ServiceRoleArn', {
      value: this.serviceRole.roleArn,
      description: 'Service role ARN',
    });

    // Tags
    cdk.Tags.of(this).add('Project', 'LocationDetectionAI');
    cdk.Tags.of(this).add('Environment', props.environmentName);
  }
}
```

**Verification:** Run `npm run build` and ensure no TypeScript errors.

### 4. Update CDK App Entry Point
**Estimated Time:** 15 minutes

```typescript
// infrastructure/bin/infrastructure.ts
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { BaseInfrastructureStack } from '../lib/base-infrastructure-stack';
import { getEnvironmentConfig } from '../lib/config';

const app = new cdk.App();
const config = getEnvironmentConfig();

// Base infrastructure stack
const baseStack = new BaseInfrastructureStack(app, `${config.stackPrefix}-Base`, {
  env: {
    account: config.account,
    region: config.region,
  },
  environmentName: config.environment,
  description: 'Base infrastructure for Location Detection AI',
});

app.synth();
```

**Verification:** Run `npx cdk synth` and confirm CloudFormation template is generated.

### 5. Configure TypeScript and Linting
**Estimated Time:** 20 minutes

```json
// infrastructure/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["es2020"],
    "declaration": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": false,
    "inlineSourceMap": true,
    "inlineSources": true,
    "experimentalDecorators": true,
    "strictPropertyInitialization": false,
    "typeRoots": ["./node_modules/@types"],
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["bin/**/*", "lib/**/*"],
  "exclude": ["node_modules", "cdk.out"]
}
```

```json
// infrastructure/.eslintrc.json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/explicit-function-return-type": "off"
  }
}
```

```json
// infrastructure/.prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

Update package.json scripts:

```json
// infrastructure/package.json - Add these scripts
{
  "scripts": {
    "build": "tsc",
    "watch": "tsc -w",
    "test": "jest",
    "cdk": "cdk",
    "lint": "eslint . --ext .ts",
    "format": "prettier --write \"**/*.ts\"",
    "synth": "cdk synth",
    "deploy": "cdk deploy --all",
    "diff": "cdk diff",
    "destroy": "cdk destroy --all"
  }
}
```

**Verification:** Run `npm run lint` and `npm run format` to ensure code quality tools work.

### 6. Create Deployment Scripts
**Estimated Time:** 25 minutes

```bash
# infrastructure/scripts/deploy.sh
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
```

```bash
# infrastructure/scripts/destroy.sh
#!/bin/bash
set -e

read -p "Are you sure you want to destroy all infrastructure? (yes/no) " -n 3 -r
echo
if [[ ! $REPLY =~ ^yes$ ]]; then
  echo "Cancelled."
  exit 1
fi

# Source environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

echo "Destroying infrastructure..."
npm run destroy -- --force

echo "Infrastructure destroyed."
```

Make scripts executable:

```bash
chmod +x infrastructure/scripts/deploy.sh
chmod +x infrastructure/scripts/destroy.sh
```

**Verification:** Run `./scripts/deploy.sh --help` to confirm script is executable.

### 7. Create Unit Tests for Infrastructure
**Estimated Time:** 30 minutes

```bash
# Install testing dependencies
npm install --save-dev jest @types/jest ts-jest aws-cdk-lib
```

```typescript
// infrastructure/test/base-infrastructure-stack.test.ts
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { BaseInfrastructureStack } from '../lib/base-infrastructure-stack';

describe('BaseInfrastructureStack', () => {
  test('creates KMS encryption key with rotation enabled', () => {
    const app = new cdk.App();
    const stack = new BaseInfrastructureStack(app, 'TestStack', {
      environmentName: 'test',
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::KMS::Key', {
      EnableKeyRotation: true,
    });
  });

  test('creates service role with correct principals', () => {
    const app = new cdk.App();
    const stack = new BaseInfrastructureStack(app, 'TestStack', {
      environmentName: 'test',
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Effect: 'Allow',
            Principal: {
              Service: ['lambda.amazonaws.com', 'sagemaker.amazonaws.com'],
            },
            Action: 'sts:AssumeRole',
          },
        ],
      },
    });
  });

  test('applies correct tags', () => {
    const app = new cdk.App();
    const stack = new BaseInfrastructureStack(app, 'TestStack', {
      environmentName: 'development',
    });

    const template = Template.fromStack(stack);

    // Check that resources have tags
    expect(template.toJSON().Resources).toBeDefined();
  });
});
```

```json
// infrastructure/jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  }
};
```

**Verification:** Run `npm test` and confirm all tests pass.

### 8. Documentation
**Estimated Time:** 20 minutes

```markdown
<!-- infrastructure/README.md -->
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
```

**Verification:** Read through README and ensure all commands work.

## Acceptance Criteria

- [ ] AWS CDK initialized with TypeScript
- [ ] Environment configuration system working
- [ ] BaseInfrastructureStack creates KMS key and IAM role
- [ ] CDK app entry point configured
- [ ] TypeScript compilation successful
- [ ] Linting and formatting configured
- [ ] Deployment scripts created and executable
- [ ] Unit tests written and passing
- [ ] README documentation complete
- [ ] Can run `npm run synth` successfully
- [ ] Can run `npm test` with all tests passing

## Testing Instructions

```bash
cd infrastructure

# Install and build
npm install
npm run build

# Run linting
npm run lint

# Run tests
npm test

# Synthesize CloudFormation (dry run)
npm run synth

# Check for stack in output
ls cdk.out/*.template.json

# Verify environment config
AWS_ACCOUNT_ID=123456789012 AWS_REGION=us-east-1 npm run synth
```

## Estimated Total Time
**3-4 hours** for a junior engineer following step-by-step.

## Next Steps
After PR-2 is merged, the following PRs can be started:
- **PR-3** (S3 Storage and API Gateway) - depends on this PR
- **PR-5** (SageMaker Async Inference) - depends on this PR

## Notes for Junior Engineers

- **AWS CDK is Infrastructure as Code** - you're writing TypeScript that generates CloudFormation
- **Don't deploy yet** - this PR is just setup, actual deployment comes in PR-3
- **Read CDK error messages** - they're usually very descriptive
- **Use `cdk synth` often** - it validates your code without deploying
- **Tags are important** - they help organize and track AWS resources
- **Test before deploying** - unit tests catch issues early
- **Keep credentials secure** - never commit .env files
