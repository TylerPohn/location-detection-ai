import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import * as path from 'path';

export interface LambdaStackProps extends cdk.StackProps {
  environmentName: string;
  blueprintBucket: s3.IBucket;
  resultsBucket: s3.IBucket;
  modelImageUri: string;
  usersTable: dynamodb.ITable;
  invitesTable: dynamodb.ITable;
  jobsTable: dynamodb.ITable;
  rateLimitsTable: dynamodb.ITable;
}

export class LambdaStack extends cdk.Stack {
  public readonly uploadHandler: lambda.Function;
  public readonly statusHandler: lambda.Function;
  public readonly resultHandler: lambda.Function;
  public readonly inferenceTrigger: lambda.Function;
  public readonly mlInferenceHandler: lambda.DockerImageFunction;
  public readonly inviteHandler: lambda.Function;
  public readonly userHandler: lambda.Function;

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    // Firebase configuration (should be set in environment or SSM Parameter Store)
    const firebaseEnv = {
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
      FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || '',
      FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY || '',
    };

    // Upload handler Lambda (creates its own role to avoid circular dependencies)
    this.uploadHandler = new lambda.Function(this, 'UploadHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../backend/src/lambdas/upload-handler')
      ),
      environment: {
        BLUEPRINT_BUCKET_NAME: props.blueprintBucket.bucketName,
        RESULTS_BUCKET_NAME: props.resultsBucket.bucketName,
        JOBS_TABLE_NAME: props.jobsTable.tableName,
        ...firebaseEnv,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    // Grant S3 permissions
    props.blueprintBucket.grantWrite(this.uploadHandler);
    props.resultsBucket.grantRead(this.uploadHandler);
    // Grant DynamoDB permissions
    props.jobsTable.grantWriteData(this.uploadHandler);
    props.usersTable.grantReadData(this.uploadHandler);
    props.rateLimitsTable.grantReadWriteData(this.uploadHandler);

    // Status handler Lambda (creates its own role to avoid circular dependencies)
    this.statusHandler = new lambda.Function(this, 'StatusHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../backend/src/lambdas/status-handler')
      ),
      environment: {
        BLUEPRINT_BUCKET_NAME: props.blueprintBucket.bucketName,
        RESULTS_BUCKET_NAME: props.resultsBucket.bucketName,
        JOBS_TABLE_NAME: props.jobsTable.tableName,
        ...firebaseEnv,
      },
      timeout: cdk.Duration.seconds(15),
      memorySize: 256,
    });

    // Grant S3 permissions
    props.blueprintBucket.grantRead(this.statusHandler);
    props.resultsBucket.grantRead(this.statusHandler);
    // Grant DynamoDB permissions
    props.jobsTable.grantReadData(this.statusHandler);

    // Result handler Lambda (updates Firestore when results are uploaded to S3)
    this.resultHandler = new lambda.Function(this, 'ResultHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../backend/src/lambdas/result-handler')
      ),
      environment: {
        RESULTS_BUCKET_NAME: props.resultsBucket.bucketName,
        ...firebaseEnv,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    // Grant S3 read permissions
    props.resultsBucket.grantRead(this.resultHandler);

    // NOTE: S3 event notification for result handler must be configured in the Storage stack
    // to avoid circular dependency (Storage stack will use this.resultHandler.functionArn)

    // ML Inference Lambda (Docker container with YOLOv8 detector)
    // Reference the ECR repository for YOLO model
    const yoloRepository = ecr.Repository.fromRepositoryName(
      this,
      'YoloDetectorRepository',
      'room-detection-yolo'
    );

    this.mlInferenceHandler = new lambda.DockerImageFunction(this, 'MLInferenceHandler', {
      code: lambda.DockerImageCode.fromEcr(yoloRepository, {
        tagOrDigest: 'latest', // Use latest YOLO model
      }),
      architecture: lambda.Architecture.X86_64, // YOLO Lambda is built for x86_64
      environment: {
        RESULTS_BUCKET_NAME: props.resultsBucket.bucketName,
        YOLO_MODEL_PATH: '/var/task/models/best.pt',
        YOLO_CONF_THRESHOLD: '0.25',
        YOLO_IOU_THRESHOLD: '0.45',
        MPLCONFIGDIR: '/tmp/matplotlib',
      },
      timeout: cdk.Duration.seconds(60), // 60s for YOLO cold start
      memorySize: 3008, // 3GB for YOLO processing
    });

    // Grant S3 permissions for ML inference
    props.blueprintBucket.grantRead(this.mlInferenceHandler);
    props.resultsBucket.grantWrite(this.mlInferenceHandler);

    // Inference trigger Lambda (triggers ML inference on S3 upload)
    this.inferenceTrigger = new lambda.Function(this, 'InferenceTrigger', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'dist/index.handler',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../backend/src/lambdas/inference-trigger')
      ),
      environment: {
        ML_LAMBDA_ARN: this.mlInferenceHandler.functionArn,
        RESULTS_BUCKET_NAME: props.resultsBucket.bucketName,
      },
      timeout: cdk.Duration.seconds(60),
      memorySize: 256,
    });

    // Grant permission to invoke ML Lambda
    this.mlInferenceHandler.grantInvoke(this.inferenceTrigger);

    // Grant S3 read permissions
    props.blueprintBucket.grantRead(this.inferenceTrigger);

    // Invite handler Lambda (admin-only invite management)
    this.inviteHandler = new lambda.Function(this, 'InviteHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../backend/src/lambdas/invite-handler')
      ),
      environment: {
        INVITES_TABLE_NAME: props.invitesTable.tableName,
        ...firebaseEnv,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    // Grant DynamoDB permissions
    props.invitesTable.grantReadWriteData(this.inviteHandler);

    // User handler Lambda (user management and registration)
    this.userHandler = new lambda.Function(this, 'UserHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../backend/src/lambdas/user-handler')
      ),
      environment: {
        USERS_TABLE_NAME: props.usersTable.tableName,
        INVITES_TABLE_NAME: props.invitesTable.tableName,
        JOBS_TABLE_NAME: props.jobsTable.tableName,
        ...firebaseEnv,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    // Grant DynamoDB permissions
    props.usersTable.grantReadWriteData(this.userHandler);
    props.invitesTable.grantReadWriteData(this.userHandler);
    props.jobsTable.grantReadData(this.userHandler);

    // NOTE: S3 event notification must be configured manually after deployment
    // to avoid circular dependency between Base/Storage/Lambda stacks.
    // Run this after deployment:
    // aws s3api put-bucket-notification-configuration \
    //   --bucket location-detection-blueprints-development \
    //   --notification-configuration file://s3-notification-config.json

    // Outputs
    new cdk.CfnOutput(this, 'UploadHandlerArn', {
      value: this.uploadHandler.functionArn,
    });

    new cdk.CfnOutput(this, 'StatusHandlerArn', {
      value: this.statusHandler.functionArn,
    });

    new cdk.CfnOutput(this, 'InferenceTriggerArn', {
      value: this.inferenceTrigger.functionArn,
      description: 'Inference trigger Lambda function ARN',
    });

    new cdk.CfnOutput(this, 'MLInferenceHandlerArn', {
      value: this.mlInferenceHandler.functionArn,
      description: 'ML inference Lambda function ARN (Docker container)',
    });

    new cdk.CfnOutput(this, 'InviteHandlerArn', {
      value: this.inviteHandler.functionArn,
      description: 'Invite handler Lambda function ARN',
    });

    new cdk.CfnOutput(this, 'UserHandlerArn', {
      value: this.userHandler.functionArn,
      description: 'User handler Lambda function ARN',
    });

    new cdk.CfnOutput(this, 'ResultHandlerArn', {
      value: this.resultHandler.functionArn,
      description: 'Result handler Lambda function ARN',
    });

    cdk.Tags.of(this).add('Project', 'LocationDetectionAI');
    cdk.Tags.of(this).add('Environment', props.environmentName);
  }
}
