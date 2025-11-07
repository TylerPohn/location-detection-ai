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
