# PR-3: S3 Storage and API Gateway Setup

## Overview
Implement S3 bucket for blueprint storage and API Gateway with Lambda integration for file upload and processing orchestration.

## Dependencies
**Requires:** PR-2 (AWS CDK Infrastructure Foundation)

## Objectives
- Create S3 bucket with encryption and lifecycle policies
- Set up API Gateway with CORS and authentication
- Implement Lambda function for pre-signed URL generation
- Create Lambda function for upload processing
- Configure S3 event notifications

## Detailed Steps

### 1. Create Storage Stack
**Estimated Time:** 35 minutes

```typescript
// infrastructure/lib/storage-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface StorageStackProps extends cdk.StackProps {
  environmentName: string;
  encryptionKey: kms.IKey;
}

export class StorageStack extends cdk.Stack {
  public readonly blueprintBucket: s3.Bucket;
  public readonly resultsBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);

    // Blueprint upload bucket
    this.blueprintBucket = new s3.Bucket(this, 'BlueprintBucket', {
      bucketName: `location-detection-blueprints-${props.environmentName}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: props.encryptionKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      lifecycleRules: [
        {
          id: 'DeleteOldBlueprints',
          enabled: true,
          expiration: cdk.Duration.days(90),
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ],
      cors: [
        {
          allowedOrigins: ['*'], // Update with actual frontend URL in production
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Results bucket for AI inference outputs
    this.resultsBucket = new s3.Bucket(this, 'ResultsBucket', {
      bucketName: `location-detection-results-${props.environmentName}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: props.encryptionKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      lifecycleRules: [
        {
          id: 'DeleteOldResults',
          enabled: true,
          expiration: cdk.Duration.days(30),
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Outputs
    new cdk.CfnOutput(this, 'BlueprintBucketName', {
      value: this.blueprintBucket.bucketName,
      description: 'Blueprint storage bucket name',
    });

    new cdk.CfnOutput(this, 'ResultsBucketName', {
      value: this.resultsBucket.bucketName,
      description: 'Results storage bucket name',
    });

    // Tags
    cdk.Tags.of(this).add('Project', 'LocationDetectionAI');
    cdk.Tags.of(this).add('Environment', props.environmentName);
  }
}
```

**Verification:** Run `npm run build` and `npm run synth` to validate.

### 2. Create API Gateway Stack
**Estimated Time:** 40 minutes

```typescript
// infrastructure/lib/api-gateway-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayIntegrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface ApiGatewayStackProps extends cdk.StackProps {
  environmentName: string;
  uploadLambda: lambda.IFunction;
  statusLambda: lambda.IFunction;
}

export class ApiGatewayStack extends cdk.Stack {
  public readonly httpApi: apigateway.HttpApi;

  constructor(scope: Construct, id: string, props: ApiGatewayStackProps) {
    super(scope, id, props);

    // HTTP API (cheaper and simpler than REST API for this use case)
    this.httpApi = new apigateway.HttpApi(this, 'LocationDetectionApi', {
      apiName: `location-detection-api-${props.environmentName}`,
      description: 'API for Location Detection AI blueprint processing',
      corsPreflight: {
        allowOrigins: ['*'], // Update with actual frontend URL in production
        allowMethods: [
          apigateway.CorsHttpMethod.GET,
          apigateway.CorsHttpMethod.POST,
          apigateway.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ['Content-Type', 'Authorization'],
        maxAge: cdk.Duration.hours(1),
      },
    });

    // Upload endpoint integration
    const uploadIntegration = new apigatewayIntegrations.HttpLambdaIntegration(
      'UploadIntegration',
      props.uploadLambda
    );

    this.httpApi.addRoutes({
      path: '/upload',
      methods: [apigateway.HttpMethod.POST],
      integration: uploadIntegration,
    });

    // Status check endpoint integration
    const statusIntegration = new apigatewayIntegrations.HttpLambdaIntegration(
      'StatusIntegration',
      props.statusLambda
    );

    this.httpApi.addRoutes({
      path: '/status/{jobId}',
      methods: [apigateway.HttpMethod.GET],
      integration: statusIntegration,
    });

    // Access logs
    const logGroup = new logs.LogGroup(this, 'ApiLogs', {
      logGroupName: `/aws/apigateway/location-detection-${props.environmentName}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Default stage with logging
    const stage = this.httpApi.defaultStage as apigateway.HttpStage;
    stage.node.addDependency(logGroup);

    // Outputs
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: this.httpApi.apiEndpoint,
      description: 'API Gateway endpoint URL',
    });

    new cdk.CfnOutput(this, 'UploadUrl', {
      value: `${this.httpApi.apiEndpoint}/upload`,
      description: 'Blueprint upload endpoint',
    });

    // Tags
    cdk.Tags.of(this).add('Project', 'LocationDetectionAI');
    cdk.Tags.of(this).add('Environment', props.environmentName);
  }
}
```

**Verification:** Run `npm run build` and check for TypeScript errors.

### 3. Create Upload Lambda Function
**Estimated Time:** 45 minutes

```typescript
// backend/src/lambdas/upload-handler/index.ts
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const BLUEPRINT_BUCKET = process.env.BLUEPRINT_BUCKET_NAME!;
const RESULTS_BUCKET = process.env.RESULTS_BUCKET_NAME!;

interface UploadRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
}

interface UploadResponse {
  jobId: string;
  uploadUrl: string;
  expiresIn: number;
}

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const request: UploadRequest = JSON.parse(event.body);

    // Validate request
    if (!request.fileName || !request.fileType) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'fileName and fileType are required' }),
      };
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf'];
    if (!allowedTypes.includes(request.fileType)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}`,
        }),
      };
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (request.fileSize > maxSize) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'File size exceeds 10MB limit' }),
      };
    }

    // Generate unique job ID
    const jobId = randomUUID();
    const fileExtension = request.fileName.split('.').pop();
    const s3Key = `blueprints/${jobId}.${fileExtension}`;

    // Generate pre-signed URL for upload
    const command = new PutObjectCommand({
      Bucket: BLUEPRINT_BUCKET,
      Key: s3Key,
      ContentType: request.fileType,
      Metadata: {
        jobId: jobId,
        originalFileName: request.fileName,
      },
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    // Prepare response
    const response: UploadResponse = {
      jobId,
      uploadUrl,
      expiresIn: 3600,
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
```

Create package.json for Lambda:

```json
// backend/src/lambdas/upload-handler/package.json
{
  "name": "upload-handler",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "@aws-sdk/client-s3": "^3.450.0",
    "@aws-sdk/s3-request-presigner": "^3.450.0"
  },
  "devDependencies": {
    "@types/aws-lambda": "^8.10.126",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0"
  }
}
```

**Verification:** Run `npm install` and `tsc` in the Lambda directory.

### 4. Create Status Lambda Function
**Estimated Time:** 30 minutes

```typescript
// backend/src/lambdas/status-handler/index.ts
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { S3Client, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const BLUEPRINT_BUCKET = process.env.BLUEPRINT_BUCKET_NAME!;
const RESULTS_BUCKET = process.env.RESULTS_BUCKET_NAME!;

interface StatusResponse {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: any;
  error?: string;
}

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    const jobId = event.pathParameters?.jobId;

    if (!jobId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'jobId is required' }),
      };
    }

    // Check if blueprint exists
    let blueprintExists = false;
    try {
      const fileExtensions = ['png', 'jpg', 'jpeg', 'pdf'];
      for (const ext of fileExtensions) {
        try {
          await s3Client.send(
            new HeadObjectCommand({
              Bucket: BLUEPRINT_BUCKET,
              Key: `blueprints/${jobId}.${ext}`,
            })
          );
          blueprintExists = true;
          break;
        } catch (e) {
          // Try next extension
        }
      }
    } catch (error) {
      // Blueprint not found
    }

    if (!blueprintExists) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Job not found' }),
      };
    }

    // Check if results exist
    const resultsKey = `results/${jobId}.json`;
    let status: StatusResponse['status'] = 'processing';
    let result;

    try {
      const resultObject = await s3Client.send(
        new GetObjectCommand({
          Bucket: RESULTS_BUCKET,
          Key: resultsKey,
        })
      );

      const resultBody = await resultObject.Body?.transformToString();
      if (resultBody) {
        result = JSON.parse(resultBody);
        status = 'completed';
      }
    } catch (error) {
      // Results not ready yet
      status = 'processing';
    }

    const response: StatusResponse = {
      jobId,
      status,
      ...(result && { result }),
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error checking status:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
```

**Verification:** Build Lambda and verify no TypeScript errors.

### 5. Update Infrastructure to Include Lambdas
**Estimated Time:** 35 minutes

```typescript
// infrastructure/lib/lambda-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

export interface LambdaStackProps extends cdk.StackProps {
  environmentName: string;
  blueprintBucket: s3.IBucket;
  resultsBucket: s3.IBucket;
  serviceRole: iam.IRole;
}

export class LambdaStack extends cdk.Stack {
  public readonly uploadHandler: lambda.Function;
  public readonly statusHandler: lambda.Function;

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    // Upload handler Lambda
    this.uploadHandler = new lambda.Function(this, 'UploadHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../backend/src/lambdas/upload-handler')
      ),
      role: props.serviceRole,
      environment: {
        BLUEPRINT_BUCKET_NAME: props.blueprintBucket.bucketName,
        RESULTS_BUCKET_NAME: props.resultsBucket.bucketName,
        AWS_REGION: this.region,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    // Grant S3 permissions
    props.blueprintBucket.grantWrite(this.uploadHandler);
    props.resultsBucket.grantRead(this.uploadHandler);

    // Status handler Lambda
    this.statusHandler = new lambda.Function(this, 'StatusHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../backend/src/lambdas/status-handler')
      ),
      role: props.serviceRole,
      environment: {
        BLUEPRINT_BUCKET_NAME: props.blueprintBucket.bucketName,
        RESULTS_BUCKET_NAME: props.resultsBucket.bucketName,
        AWS_REGION: this.region,
      },
      timeout: cdk.Duration.seconds(15),
      memorySize: 256,
    });

    // Grant S3 permissions
    props.blueprintBucket.grantRead(this.statusHandler);
    props.resultsBucket.grantRead(this.statusHandler);

    // Outputs
    new cdk.CfnOutput(this, 'UploadHandlerArn', {
      value: this.uploadHandler.functionArn,
    });

    new cdk.CfnOutput(this, 'StatusHandlerArn', {
      value: this.statusHandler.functionArn,
    });

    cdk.Tags.of(this).add('Project', 'LocationDetectionAI');
    cdk.Tags.of(this).add('Environment', props.environmentName);
  }
}
```

**Verification:** Run `npm run synth` to ensure stack synthesis succeeds.

### 6. Wire Everything Together in CDK App
**Estimated Time:** 20 minutes

```typescript
// infrastructure/bin/infrastructure.ts - Update to include new stacks
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { BaseInfrastructureStack } from '../lib/base-infrastructure-stack';
import { StorageStack } from '../lib/storage-stack';
import { LambdaStack } from '../lib/lambda-stack';
import { ApiGatewayStack } from '../lib/api-gateway-stack';
import { getEnvironmentConfig } from '../lib/config';

const app = new cdk.App();
const config = getEnvironmentConfig();

const env = {
  account: config.account,
  region: config.region,
};

// Base infrastructure
const baseStack = new BaseInfrastructureStack(app, `${config.stackPrefix}-Base`, {
  env,
  environmentName: config.environment,
});

// Storage
const storageStack = new StorageStack(app, `${config.stackPrefix}-Storage`, {
  env,
  environmentName: config.environment,
  encryptionKey: baseStack.encryptionKey,
});
storageStack.addDependency(baseStack);

// Lambda functions
const lambdaStack = new LambdaStack(app, `${config.stackPrefix}-Lambda`, {
  env,
  environmentName: config.environment,
  blueprintBucket: storageStack.blueprintBucket,
  resultsBucket: storageStack.resultsBucket,
  serviceRole: baseStack.serviceRole,
});
lambdaStack.addDependency(storageStack);

// API Gateway
const apiStack = new ApiGatewayStack(app, `${config.stackPrefix}-Api`, {
  env,
  environmentName: config.environment,
  uploadLambda: lambdaStack.uploadHandler,
  statusLambda: lambdaStack.statusHandler,
});
apiStack.addDependency(lambdaStack);

app.synth();
```

**Verification:** Run `npm run synth` and verify all 4 stacks are generated.

### 7. Write Integration Tests
**Estimated Time:** 30 minutes

```typescript
// infrastructure/test/storage-stack.test.ts
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { StorageStack } from '../lib/storage-stack';
import * as kms from 'aws-cdk-lib/aws-kms';

describe('StorageStack', () => {
  test('creates blueprint bucket with encryption', () => {
    const app = new cdk.App();
    const key = new kms.Key(app, 'TestKey');
    const stack = new StorageStack(app, 'TestStack', {
      environmentName: 'test',
      encryptionKey: key,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'aws:kms',
            },
          },
        ],
      },
    });
  });

  test('enables versioning on blueprint bucket', () => {
    const app = new cdk.App();
    const key = new kms.Key(app, 'TestKey');
    const stack = new StorageStack(app, 'TestStack', {
      environmentName: 'test',
      encryptionKey: key,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::S3::Bucket', {
      VersioningConfiguration: {
        Status: 'Enabled',
      },
    });
  });
});
```

**Verification:** Run `npm test` and verify tests pass.

## Acceptance Criteria

- [ ] StorageStack creates two S3 buckets with encryption
- [ ] ApiGatewayStack creates HTTP API with CORS
- [ ] Upload Lambda generates pre-signed URLs
- [ ] Status Lambda checks job status from S3
- [ ] All stacks synthesize without errors
- [ ] Integration tests pass
- [ ] CDK can deploy to AWS (dry-run with `cdk diff`)
- [ ] Environment variables configured correctly
- [ ] CloudFormation outputs include API endpoint

## Testing Instructions

```bash
# Build all code
cd infrastructure
npm run build
cd ../backend/src/lambdas/upload-handler
npm install && npm run build
cd ../status-handler
npm install && npm run build

# Run infrastructure tests
cd ../../../../infrastructure
npm test

# Synthesize CloudFormation
npm run synth

# Check generated templates
ls cdk.out/*.template.json

# View diff (requires AWS credentials)
npm run diff
```

## Estimated Total Time
**4-5 hours** for a junior engineer following step-by-step.

## Next Steps
After PR-3 is merged, the following PRs can be started in parallel:
- **PR-4** (OpenCV Detector) - depends on S3 buckets
- **PR-7** (Blueprint Upload UI) - depends on API Gateway

## Notes for Junior Engineers

- **Pre-signed URLs are temporary** - they expire after 1 hour
- **S3 buckets must have unique names** - add your initials if name conflicts occur
- **CORS is important** - frontend can't upload without it
- **Lambda needs permissions** - granted via IAM role policies
- **Test locally first** - use `npm run synth` before deploying
- **Read CloudFormation errors carefully** - they show exactly what's wrong
