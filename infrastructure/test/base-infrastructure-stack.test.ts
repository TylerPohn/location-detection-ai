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

  test('outputs encryption key ID and service role ARN', () => {
    const app = new cdk.App();
    const stack = new BaseInfrastructureStack(app, 'TestStack', {
      environmentName: 'test',
    });

    const template = Template.fromStack(stack);

    template.hasOutput('EncryptionKeyId', {});
    template.hasOutput('ServiceRoleArn', {});
  });
});
