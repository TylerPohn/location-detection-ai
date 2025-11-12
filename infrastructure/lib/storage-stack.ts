import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Notifications from 'aws-cdk-lib/aws-s3-notifications';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface StorageStackProps extends cdk.StackProps {
  environmentName: string;
}

export class StorageStack extends cdk.Stack {
  public readonly blueprintBucket: s3.Bucket;
  public readonly resultsBucket: s3.Bucket;
  public readonly encryptionKey: kms.Key;

  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);

    // Create KMS encryption key for storage buckets
    this.encryptionKey = new kms.Key(this, 'StorageEncryptionKey', {
      description: `Location Detection AI ${props.environmentName} storage encryption key`,
      enableKeyRotation: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Blueprint upload bucket
    this.blueprintBucket = new s3.Bucket(this, 'BlueprintBucket', {
      bucketName: `location-detection-blueprints-${props.environmentName}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: this.encryptionKey,
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
          allowedOrigins: [
            process.env.FRONTEND_URL || 'http://localhost:5173',
            'http://localhost:3000',
            'http://localhost:5174',
            'https://location-detection-ai-frontend.vercel.app',
          ],
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag'],
          maxAge: 3000,
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Results bucket for AI inference outputs
    this.resultsBucket = new s3.Bucket(this, 'ResultsBucket', {
      bucketName: `location-detection-results-${props.environmentName}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: this.encryptionKey,
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

  /**
   * Add S3 event trigger for blueprint uploads.
   * This method is called after the Lambda function is created.
   */
  public addBlueprintUploadTrigger(triggerFunction: lambda.IFunction): void {
    this.blueprintBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3Notifications.LambdaDestination(triggerFunction),
      { prefix: 'blueprints/' }
    );
  }

  /**
   * Add S3 event trigger for result uploads.
   * This method is called after the Lambda function is created.
   */
  public addResultUploadTrigger(triggerFunction: lambda.IFunction): void {
    this.resultsBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3Notifications.LambdaDestination(triggerFunction),
      { prefix: 'results/', suffix: '.json' }
    );
  }
}
