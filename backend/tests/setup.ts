/**
 * Backend Test Setup
 * Global test configuration and mocks
 */

// Set test environment variables
process.env.AWS_REGION = 'us-east-1';
process.env.BLUEPRINT_BUCKET_NAME = 'test-blueprint-bucket';
process.env.RESULTS_BUCKET_NAME = 'test-results-bucket';
process.env.FIREBASE_PROJECT_ID = 'test-project';
process.env.FIREBASE_PRIVATE_KEY = 'test-private-key';
process.env.FIREBASE_CLIENT_EMAIL = 'test@test.iam.gserviceaccount.com';

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/client-sagemaker-runtime');
jest.mock('@aws-sdk/s3-request-presigner');

// Global test timeout
jest.setTimeout(10000);
