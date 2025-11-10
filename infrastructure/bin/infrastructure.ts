#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { BaseInfrastructureStack } from '../lib/base-infrastructure-stack';
import { StorageStack } from '../lib/storage-stack';
import { DynamoDBStack } from '../lib/dynamodb-stack';
import { LambdaStack } from '../lib/lambda-stack';
import { ApiGatewayStack } from '../lib/api-gateway-stack';
import { getEnvironmentConfig } from '../lib/config';

const app = new cdk.App();
const config = getEnvironmentConfig();

// Get model image URI from context (passed during deploy)
const modelImageUri = app.node.tryGetContext('modelImageUri') ||
  `${config.account}.dkr.ecr.${config.region}.amazonaws.com/location-detector:latest`;

const stackProps = {
  env: {
    account: config.account,
    region: config.region,
  },
  environmentName: config.environment,
};

// 1. Base infrastructure (KMS, IAM roles)
const baseStack = new BaseInfrastructureStack(app, `${config.stackPrefix}-Base`, {
  ...stackProps,
  description: 'Base infrastructure for Location Detection AI',
});

// 2. Storage (S3 buckets with own encryption key)
const storageStack = new StorageStack(app, `${config.stackPrefix}-Storage`, {
  ...stackProps,
  description: 'S3 storage buckets for blueprints and results',
});
// Storage creates its own encryption key to avoid circular dependencies

// 3. DynamoDB tables for user management and job tracking
const dynamoDBStack = new DynamoDBStack(app, `${config.stackPrefix}-DynamoDB`, {
  ...stackProps,
  description: 'DynamoDB tables for users, invites, and jobs',
});

// 4. Lambda functions (including ML inference container)
const lambdaStack = new LambdaStack(app, `${config.stackPrefix}-Lambda`, {
  ...stackProps,
  blueprintBucket: storageStack.blueprintBucket,
  resultsBucket: storageStack.resultsBucket,
  modelImageUri: modelImageUri,
  usersTable: dynamoDBStack.usersTable,
  invitesTable: dynamoDBStack.invitesTable,
  jobsTable: dynamoDBStack.jobsTable,
  rateLimitsTable: dynamoDBStack.rateLimitsTable,
  description: 'Lambda functions for API handlers and ML inference',
});
// Lambda functions create their own execution roles to avoid circular dependencies

// NOTE: S3 event notifications must be configured manually after deployment
// to avoid circular dependency between Storage and Lambda stacks.
// Run these commands after stack deployment:
// 1. Blueprint upload trigger (already configured)
// 2. Result upload trigger: aws s3api put-bucket-notification-configuration --bucket location-detection-results-development --notification-configuration file://s3-result-notification-config.json

// 5. API Gateway
const apiStack = new ApiGatewayStack(app, `${config.stackPrefix}-Api`, {
  ...stackProps,
  uploadLambda: lambdaStack.uploadHandler,
  statusLambda: lambdaStack.statusHandler,
  inviteLambda: lambdaStack.inviteHandler,
  userLambda: lambdaStack.userHandler,
  description: 'HTTP API Gateway for Location Detection AI',
});
// Note: No explicit dependency needed - CDK will infer from Lambda references

app.synth();
