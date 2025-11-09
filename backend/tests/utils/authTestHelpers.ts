/**
 * Test Helpers for Firebase Authentication
 * Provides mock tokens, test users, and utility functions for auth testing
 */

import { DecodedIdToken } from 'firebase-admin/auth';

export interface TestUser {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  emailVerified: boolean;
}

export const TEST_USERS: Record<string, TestUser> = {
  admin: {
    uid: 'test-admin-uid-123',
    email: 'admin@test.com',
    name: 'Test Admin',
    role: 'admin',
    emailVerified: true,
  },
  user: {
    uid: 'test-user-uid-456',
    email: 'user@test.com',
    name: 'Test User',
    role: 'user',
    emailVerified: true,
  },
  unverifiedUser: {
    uid: 'test-unverified-uid-789',
    email: 'unverified@test.com',
    name: 'Unverified User',
    role: 'user',
    emailVerified: false,
  },
};

/**
 * Create a mock Firebase ID token
 */
export function createMockToken(user: TestUser): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(
    JSON.stringify({
      uid: user.uid,
      email: user.email,
      email_verified: user.emailVerified,
      name: user.name,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
  ).toString('base64');
  const signature = Buffer.from('mock-signature').toString('base64');

  return `${header}.${payload}.${signature}`;
}

/**
 * Create a mock decoded ID token
 */
export function createMockDecodedToken(user: TestUser): DecodedIdToken {
  return {
    uid: user.uid,
    email: user.email,
    email_verified: user.emailVerified,
    name: user.name,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    aud: 'test-project',
    auth_time: Math.floor(Date.now() / 1000),
    sub: user.uid,
    firebase: {
      identities: {
        email: [user.email],
      },
      sign_in_provider: 'google.com',
    },
  } as DecodedIdToken;
}

/**
 * Create a mock Authorization header
 */
export function createAuthHeader(user: TestUser): string {
  return `Bearer ${createMockToken(user)}`;
}

/**
 * Create a mock API Gateway event with auth
 */
export function createMockAPIGatewayEvent(
  user: TestUser | null,
  options: {
    path?: string;
    method?: string;
    body?: any;
    pathParameters?: Record<string, string>;
    queryStringParameters?: Record<string, string>;
  } = {}
) {
  return {
    version: '2.0',
    routeKey: `${options.method || 'GET'} ${options.path || '/'}`,
    rawPath: options.path || '/',
    headers: {
      'content-type': 'application/json',
      ...(user && { authorization: createAuthHeader(user) }),
    },
    requestContext: {
      http: {
        method: options.method || 'GET',
        path: options.path || '/',
      },
      requestId: `test-request-${Date.now()}`,
      time: new Date().toISOString(),
      timeEpoch: Date.now(),
    },
    pathParameters: options.pathParameters || {},
    queryStringParameters: options.queryStringParameters || {},
    body: options.body ? JSON.stringify(options.body) : undefined,
    isBase64Encoded: false,
  };
}

/**
 * Mock Firebase Admin initialization
 */
export function mockFirebaseAdmin() {
  return {
    auth: () => ({
      verifyIdToken: jest.fn(),
      getUserByEmail: jest.fn(),
      setCustomUserClaims: jest.fn(),
      getUser: jest.fn(),
    }),
    firestore: () => ({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest.fn(),
          set: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        })),
        where: jest.fn(() => ({
          get: jest.fn(),
        })),
        add: jest.fn(),
      })),
    }),
  };
}

/**
 * Create a mock invite document
 */
export function createMockInvite(overrides: Partial<any> = {}) {
  return {
    email: 'invitee@test.com',
    role: 'user',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    createdBy: TEST_USERS.admin.uid,
    used: false,
    ...overrides,
  };
}

/**
 * Assert response matches expected structure
 */
export function assertSuccessResponse(response: any, statusCode = 200) {
  expect(response).toHaveProperty('statusCode', statusCode);
  expect(response).toHaveProperty('body');

  const body = JSON.parse(response.body);
  expect(body).not.toHaveProperty('error');

  return body;
}

/**
 * Assert response is an error
 */
export function assertErrorResponse(
  response: any,
  statusCode: number,
  errorMessage?: string
) {
  expect(response).toHaveProperty('statusCode', statusCode);
  expect(response).toHaveProperty('body');

  const body = JSON.parse(response.body);
  expect(body).toHaveProperty('error');

  if (errorMessage) {
    expect(body.error).toContain(errorMessage);
  }

  return body;
}

/**
 * Wait for async operations
 */
export async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a mock DynamoDB document
 */
export function createMockJobDocument(userId: string, overrides: Partial<any> = {}) {
  return {
    jobId: `test-job-${Date.now()}`,
    userId,
    status: 'pending',
    createdAt: new Date().toISOString(),
    fileName: 'test-blueprint.png',
    fileSize: 1024000,
    ...overrides,
  };
}
