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
  endpointName?: string;
  endpointArn?: string;
}

export class LambdaStack extends cdk.Stack {
  public readonly uploadHandler: lambda.Function;
  public readonly statusHandler: lambda.Function;
  public readonly inferenceTrigger: lambda.Function;

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

    // Inference trigger Lambda
    this.inferenceTrigger = new lambda.Function(this, 'InferenceTrigger', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../backend/src/lambdas/inference-trigger')
      ),
      role: props.serviceRole,
      environment: {
        SAGEMAKER_ENDPOINT_NAME: props.endpointName || 'location-detector-dev',
        RESULTS_BUCKET_NAME: props.resultsBucket.bucketName,
        AWS_REGION: this.region,
      },
      timeout: cdk.Duration.seconds(60),
      memorySize: 256,
    });

    // Grant SageMaker invoke permissions
    this.inferenceTrigger.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['sagemaker:InvokeEndpointAsync'],
        resources: props.endpointArn
          ? [props.endpointArn]
          : [`arn:aws:sagemaker:${this.region}:${this.account}:endpoint/*`],
      })
    );

    // Grant S3 read permissions
    props.blueprintBucket.grantRead(this.inferenceTrigger);

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

    cdk.Tags.of(this).add('Project', 'LocationDetectionAI');
    cdk.Tags.of(this).add('Environment', props.environmentName);
  }
}
