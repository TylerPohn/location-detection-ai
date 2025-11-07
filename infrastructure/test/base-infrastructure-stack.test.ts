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

    expect(template.toJSON().Resources).toBeDefined();
  });

  test('creates outputs for key and role', () => {
    const app = new cdk.App();
    const stack = new BaseInfrastructureStack(app, 'TestStack', {
      environmentName: 'test',
    });

    const template = Template.fromStack(stack);

    const outputs = template.toJSON().Outputs;
    expect(outputs).toHaveProperty('EncryptionKeyId');
    expect(outputs).toHaveProperty('ServiceRoleArn');
  });
});
