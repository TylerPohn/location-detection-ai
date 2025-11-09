import * as cdk from 'aws-cdk-lib';
import * as sagemaker from 'aws-cdk-lib/aws-sagemaker';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

export interface SageMakerStackProps extends cdk.StackProps {
  environmentName: string;
  blueprintBucket: s3.IBucket;
  resultsBucket: s3.IBucket;
  modelImageUri: string;
  serviceRole: iam.IRole;
}

export class SageMakerStack extends cdk.Stack {
  public readonly endpoint: sagemaker.CfnEndpoint;
  public readonly endpointConfigName: string;
  public readonly modelName: string;
  public readonly sagemakerRole: iam.Role;

  constructor(scope: Construct, id: string, props: SageMakerStackProps) {
    super(scope, id, props);

    // SageMaker execution role (simplified - no SNS needed)
    this.sagemakerRole = new iam.Role(this, 'SageMakerRole', {
      assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'),
      ],
    });

    // Grant S3 access
    props.blueprintBucket.grantRead(this.sagemakerRole);
    props.resultsBucket.grantWrite(this.sagemakerRole);

    // SageMaker Model
    this.modelName = `location-detector-${props.environmentName}`;

    const model = new sagemaker.CfnModel(this, 'DetectorModel', {
      modelName: this.modelName,
      executionRoleArn: this.sagemakerRole.roleArn,
      primaryContainer: {
        image: props.modelImageUri,
        mode: 'SingleModel',
      },
    });

    // Endpoint Configuration (Real-time, synchronous)
    this.endpointConfigName = `location-detector-config-${props.environmentName}`;

    const endpointConfig = new sagemaker.CfnEndpointConfig(this, 'EndpointConfig', {
      endpointConfigName: this.endpointConfigName,
      productionVariants: [
        {
          modelName: model.modelName!,
          variantName: 'AllTraffic',
          initialInstanceCount: 1,
          instanceType: 'ml.t2.medium',  // Smaller, cheaper instance for real-time
          initialVariantWeight: 1,
        },
      ],
    });

    endpointConfig.addDependency(model);

    // SageMaker Endpoint
    const endpointName = `location-detector-${props.environmentName}`;

    this.endpoint = new sagemaker.CfnEndpoint(this, 'Endpoint', {
      endpointName: endpointName,
      endpointConfigName: endpointConfig.endpointConfigName!,
    });

    this.endpoint.addDependency(endpointConfig);

    // Outputs
    new cdk.CfnOutput(this, 'EndpointName', {
      value: this.endpoint.endpointName!,
      description: 'SageMaker endpoint name',
      exportName: `${props.environmentName}-SageMakerEndpointName`,
    });

    new cdk.CfnOutput(this, 'EndpointArn', {
      value: `arn:aws:sagemaker:${this.region}:${this.account}:endpoint/${this.endpoint.endpointName}`,
      description: 'SageMaker endpoint ARN',
      exportName: `${props.environmentName}-SageMakerEndpointArn`,
    });

    new cdk.CfnOutput(this, 'ModelImageUri', {
      value: props.modelImageUri,
      description: 'Docker image URI for SageMaker model',
    });

    // Tags
    cdk.Tags.of(this).add('Project', 'LocationDetectionAI');
    cdk.Tags.of(this).add('Environment', props.environmentName);
    cdk.Tags.of(this).add('Component', 'SageMaker');
  }
}
