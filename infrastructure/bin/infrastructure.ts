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
