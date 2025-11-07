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

  test('blocks public access on all buckets', () => {
    const app = new cdk.App();
    const key = new kms.Key(app, 'TestKey');
    const stack = new StorageStack(app, 'TestStack', {
      environmentName: 'test',
      encryptionKey: key,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  test('creates two S3 buckets', () => {
    const app = new cdk.App();
    const key = new kms.Key(app, 'TestKey');
    const stack = new StorageStack(app, 'TestStack', {
      environmentName: 'test',
      encryptionKey: key,
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::S3::Bucket', 2);
  });

  test('configures CORS on blueprint bucket', () => {
    const app = new cdk.App();
    const key = new kms.Key(app, 'TestKey');
    const stack = new StorageStack(app, 'TestStack', {
      environmentName: 'test',
      encryptionKey: key,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::S3::Bucket', {
      CorsConfiguration: {
        CorsRules: [
          {
            AllowedMethods: ['GET', 'PUT', 'POST'],
            AllowedOrigins: ['*'],
            AllowedHeaders: ['*'],
            MaxAge: 3000,
          },
        ],
      },
    });
  });
});
