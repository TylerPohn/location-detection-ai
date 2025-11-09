interface EnvironmentConfig {
  apiBaseUrl: string;
  awsRegion: string;
  isDevelopment: boolean;
  isProduction: boolean;
  isDemoMode: boolean;
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    appId: string;
  };
}

// Check if demo mode is enabled
export const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

export const env: EnvironmentConfig = {
  apiBaseUrl: import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3001',
  awsRegion: import.meta.env.VITE_AWS_REGION || 'us-east-1',
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  isDemoMode,
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  },
};

// Validate required environment variables (skip in demo mode)
if (env.isProduction && !env.isDemoMode) {
  if (!import.meta.env.VITE_API_GATEWAY_URL) {
    throw new Error('VITE_API_GATEWAY_URL is required in production');
  }
  if (!env.firebase.apiKey || !env.firebase.authDomain || !env.firebase.projectId) {
    throw new Error('Firebase configuration is required in production');
  }
}
