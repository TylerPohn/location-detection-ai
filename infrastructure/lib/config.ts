export interface EnvironmentConfig {
  account: string;
  region: string;
  environment: 'development' | 'production';
  stackPrefix: string;
}

export function getEnvironmentConfig(): EnvironmentConfig {
  const env = process.env.ENVIRONMENT || 'development';
  const accountId = process.env.AWS_ACCOUNT_ID;
  const region = process.env.AWS_REGION || 'us-east-1';

  if (!accountId) {
    throw new Error('AWS_ACCOUNT_ID environment variable is required');
  }

  return {
    account: accountId,
    region: region,
    environment: env as 'development' | 'production',
    stackPrefix: env === 'production' ? 'LocDetAI-Prod' : 'LocDetAI-Dev',
  };
}
