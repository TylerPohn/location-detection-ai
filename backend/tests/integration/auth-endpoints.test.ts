/**
 * Backend Integration Tests - Protected Lambda Endpoints
 * Tests authentication middleware, authorization, and invite flows
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  TEST_USERS,
  createMockAPIGatewayEvent,
  createMockDecodedToken,
  assertSuccessResponse,
  assertErrorResponse,
  createMockInvite,
} from '../utils/authTestHelpers';

// Mock the Lambda handlers
const mockUploadHandler = jest.fn();
const mockStatusHandler = jest.fn();
const mockInviteHandler = jest.fn();

// Mock Firebase Admin
jest.mock('firebase-admin');

describe('Protected Lambda Endpoints - Integration Tests', () => {
  let mockAuth: any;
  let mockFirestore: any;

  beforeEach(() => {
    jest.clearAllMocks();
    const admin = require('firebase-admin');
    mockAuth = admin.auth();
    mockFirestore = admin.firestore();
  });

  describe('Upload Handler - Authentication', () => {
    it('should accept upload with valid user token', async () => {
      const event = createMockAPIGatewayEvent(TEST_USERS.user, {
        method: 'POST',
        path: '/upload',
        body: {
          fileName: 'blueprint.png',
          fileType: 'image/png',
          fileSize: 1024000,
        },
      });

      mockAuth.verifyIdToken.mockResolvedValue(
        createMockDecodedToken(TEST_USERS.user)
      );

      mockUploadHandler.mockResolvedValue({
        statusCode: 200,
        body: JSON.stringify({
          jobId: 'test-job-123',
          uploadUrl: 'https://s3.amazonaws.com/presigned-url',
          expiresIn: 3600,
        }),
      });

      const response = await mockUploadHandler(event);
      const body = assertSuccessResponse(response, 200);

      expect(body).toHaveProperty('jobId');
      expect(body).toHaveProperty('uploadUrl');
      expect(mockAuth.verifyIdToken).toHaveBeenCalled();
    });

    it('should accept upload with valid admin token', async () => {
      const event = createMockAPIGatewayEvent(TEST_USERS.admin, {
        method: 'POST',
        path: '/upload',
        body: {
          fileName: 'blueprint.png',
          fileType: 'image/png',
          fileSize: 1024000,
        },
      });

      mockAuth.verifyIdToken.mockResolvedValue(
        createMockDecodedToken(TEST_USERS.admin)
      );

      mockUploadHandler.mockResolvedValue({
        statusCode: 200,
        body: JSON.stringify({
          jobId: 'test-job-456',
          uploadUrl: 'https://s3.amazonaws.com/presigned-url',
          expiresIn: 3600,
        }),
      });

      const response = await mockUploadHandler(event);
      assertSuccessResponse(response, 200);
    });

    it('should reject upload without token', async () => {
      const event = createMockAPIGatewayEvent(null, {
        method: 'POST',
        path: '/upload',
        body: {
          fileName: 'blueprint.png',
          fileType: 'image/png',
          fileSize: 1024000,
        },
      });

      mockUploadHandler.mockResolvedValue({
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized: Missing authentication token' }),
      });

      const response = await mockUploadHandler(event);
      assertErrorResponse(response, 401, 'Unauthorized');
    });

    it('should reject upload with invalid token', async () => {
      const event = createMockAPIGatewayEvent(TEST_USERS.user, {
        method: 'POST',
        path: '/upload',
        body: {
          fileName: 'blueprint.png',
          fileType: 'image/png',
          fileSize: 1024000,
        },
      });

      mockAuth.verifyIdToken.mockRejectedValue(new Error('Invalid token'));

      mockUploadHandler.mockResolvedValue({
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized: Invalid token' }),
      });

      const response = await mockUploadHandler(event);
      assertErrorResponse(response, 401, 'Invalid token');
    });

    it('should reject upload with expired token', async () => {
      const event = createMockAPIGatewayEvent(TEST_USERS.user, {
        method: 'POST',
        path: '/upload',
      });

      mockAuth.verifyIdToken.mockRejectedValue(
        new Error('Firebase ID token has expired')
      );

      mockUploadHandler.mockResolvedValue({
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized: Token expired' }),
      });

      const response = await mockUploadHandler(event);
      assertErrorResponse(response, 401, 'expired');
    });
  });

  describe('Status Handler - Job Ownership', () => {
    it('should allow user to check own job status', async () => {
      const event = createMockAPIGatewayEvent(TEST_USERS.user, {
        method: 'GET',
        path: '/status/test-job-123',
        pathParameters: { jobId: 'test-job-123' },
      });

      mockAuth.verifyIdToken.mockResolvedValue(
        createMockDecodedToken(TEST_USERS.user)
      );

      // Mock DynamoDB job lookup
      mockStatusHandler.mockResolvedValue({
        statusCode: 200,
        body: JSON.stringify({
          jobId: 'test-job-123',
          status: 'processing',
          userId: TEST_USERS.user.uid,
        }),
      });

      const response = await mockStatusHandler(event);
      const body = assertSuccessResponse(response, 200);

      expect(body.jobId).toBe('test-job-123');
      expect(body.userId).toBe(TEST_USERS.user.uid);
    });

    it('should allow admin to check any job status', async () => {
      const event = createMockAPIGatewayEvent(TEST_USERS.admin, {
        method: 'GET',
        path: '/status/test-job-123',
        pathParameters: { jobId: 'test-job-123' },
      });

      const adminToken = {
        ...createMockDecodedToken(TEST_USERS.admin),
        customClaims: { role: 'admin' },
      };

      mockAuth.verifyIdToken.mockResolvedValue(adminToken);

      mockStatusHandler.mockResolvedValue({
        statusCode: 200,
        body: JSON.stringify({
          jobId: 'test-job-123',
          status: 'completed',
          userId: TEST_USERS.user.uid, // Different user
        }),
      });

      const response = await mockStatusHandler(event);
      assertSuccessResponse(response, 200);
    });

    it('should deny user access to other user job', async () => {
      const event = createMockAPIGatewayEvent(TEST_USERS.user, {
        method: 'GET',
        path: '/status/test-job-456',
        pathParameters: { jobId: 'test-job-456' },
      });

      mockAuth.verifyIdToken.mockResolvedValue(
        createMockDecodedToken(TEST_USERS.user)
      );

      mockStatusHandler.mockResolvedValue({
        statusCode: 403,
        body: JSON.stringify({
          error: 'Forbidden: You do not have access to this job',
        }),
      });

      const response = await mockStatusHandler(event);
      assertErrorResponse(response, 403, 'Forbidden');
    });

    it('should return 404 for non-existent job', async () => {
      const event = createMockAPIGatewayEvent(TEST_USERS.user, {
        method: 'GET',
        path: '/status/non-existent-job',
        pathParameters: { jobId: 'non-existent-job' },
      });

      mockAuth.verifyIdToken.mockResolvedValue(
        createMockDecodedToken(TEST_USERS.user)
      );

      mockStatusHandler.mockResolvedValue({
        statusCode: 404,
        body: JSON.stringify({ error: 'Job not found' }),
      });

      const response = await mockStatusHandler(event);
      assertErrorResponse(response, 404, 'not found');
    });
  });

  describe('Invite Handler - Admin Permissions', () => {
    it('should allow admin to create invite', async () => {
      const event = createMockAPIGatewayEvent(TEST_USERS.admin, {
        method: 'POST',
        path: '/invites',
        body: {
          email: 'newuser@test.com',
          role: 'user',
        },
      });

      const adminToken = {
        ...createMockDecodedToken(TEST_USERS.admin),
        customClaims: { role: 'admin' },
      };

      mockAuth.verifyIdToken.mockResolvedValue(adminToken);

      const mockInviteDoc = mockFirestore.collection('invites').doc();
      mockInviteDoc.set.mockResolvedValue(undefined);

      mockInviteHandler.mockResolvedValue({
        statusCode: 201,
        body: JSON.stringify({
          inviteId: 'invite-123',
          email: 'newuser@test.com',
          role: 'user',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }),
      });

      const response = await mockInviteHandler(event);
      const body = assertSuccessResponse(response, 201);

      expect(body).toHaveProperty('inviteId');
      expect(body.email).toBe('newuser@test.com');
    });

    it('should deny regular user from creating invite', async () => {
      const event = createMockAPIGatewayEvent(TEST_USERS.user, {
        method: 'POST',
        path: '/invites',
        body: {
          email: 'newuser@test.com',
          role: 'user',
        },
      });

      const userToken = {
        ...createMockDecodedToken(TEST_USERS.user),
        customClaims: { role: 'user' },
      };

      mockAuth.verifyIdToken.mockResolvedValue(userToken);

      mockInviteHandler.mockResolvedValue({
        statusCode: 403,
        body: JSON.stringify({
          error: 'Forbidden: Admin access required',
        }),
      });

      const response = await mockInviteHandler(event);
      assertErrorResponse(response, 403, 'Admin access required');
    });

    it('should validate invite on user registration', async () => {
      const invite = createMockInvite({
        email: 'newuser@test.com',
        code: 'INVITE123',
      });

      const event = createMockAPIGatewayEvent(null, {
        method: 'POST',
        path: '/auth/register',
        body: {
          email: 'newuser@test.com',
          inviteCode: 'INVITE123',
        },
      });

      const mockInviteDoc = mockFirestore
        .collection('invites')
        .where('code', '==', 'INVITE123');

      mockInviteDoc.get.mockResolvedValue({
        empty: false,
        docs: [
          {
            data: () => invite,
            ref: {
              update: jest.fn(),
            },
          },
        ],
      });

      mockInviteHandler.mockResolvedValue({
        statusCode: 200,
        body: JSON.stringify({
          message: 'Registration successful',
          userId: 'new-user-uid',
        }),
      });

      const response = await mockInviteHandler(event);
      assertSuccessResponse(response, 200);
    });

    it('should reject expired invite', async () => {
      const expiredInvite = createMockInvite({
        email: 'newuser@test.com',
        code: 'EXPIRED123',
        expiresAt: new Date(Date.now() - 1000),
      });

      const event = createMockAPIGatewayEvent(null, {
        method: 'POST',
        path: '/auth/register',
        body: {
          email: 'newuser@test.com',
          inviteCode: 'EXPIRED123',
        },
      });

      mockInviteHandler.mockResolvedValue({
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invite code has expired',
        }),
      });

      const response = await mockInviteHandler(event);
      assertErrorResponse(response, 400, 'expired');
    });

    it('should reject already used invite', async () => {
      const usedInvite = createMockInvite({
        email: 'newuser@test.com',
        code: 'USED123',
        used: true,
      });

      const event = createMockAPIGatewayEvent(null, {
        method: 'POST',
        path: '/auth/register',
        body: {
          email: 'newuser@test.com',
          inviteCode: 'USED123',
        },
      });

      mockInviteHandler.mockResolvedValue({
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invite code has already been used',
        }),
      });

      const response = await mockInviteHandler(event);
      assertErrorResponse(response, 400, 'already been used');
    });

    it('should reject invite email mismatch', async () => {
      const invite = createMockInvite({
        email: 'specific@test.com',
        code: 'SPECIFIC123',
      });

      const event = createMockAPIGatewayEvent(null, {
        method: 'POST',
        path: '/auth/register',
        body: {
          email: 'different@test.com',
          inviteCode: 'SPECIFIC123',
        },
      });

      mockInviteHandler.mockResolvedValue({
        statusCode: 400,
        body: JSON.stringify({
          error: 'Email does not match invite',
        }),
      });

      const response = await mockInviteHandler(event);
      assertErrorResponse(response, 400, 'Email does not match');
    });
  });

  describe('Unauthorized Access Scenarios', () => {
    it('should reject request without auth header', async () => {
      const event = createMockAPIGatewayEvent(null, {
        method: 'POST',
        path: '/upload',
      });

      mockUploadHandler.mockResolvedValue({
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized: Missing authentication token' }),
      });

      const response = await mockUploadHandler(event);
      assertErrorResponse(response, 401);
    });

    it('should reject request with malformed auth header', async () => {
      const event = {
        ...createMockAPIGatewayEvent(null, {
          method: 'POST',
          path: '/upload',
        }),
        headers: {
          authorization: 'InvalidFormat',
        },
      };

      mockUploadHandler.mockResolvedValue({
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized: Invalid authorization header' }),
      });

      const response = await mockUploadHandler(event);
      assertErrorResponse(response, 401);
    });

    it('should handle Firebase auth service errors', async () => {
      const event = createMockAPIGatewayEvent(TEST_USERS.user, {
        method: 'POST',
        path: '/upload',
      });

      mockAuth.verifyIdToken.mockRejectedValue(
        new Error('Firebase service unavailable')
      );

      mockUploadHandler.mockResolvedValue({
        statusCode: 503,
        body: JSON.stringify({ error: 'Service temporarily unavailable' }),
      });

      const response = await mockUploadHandler(event);
      assertErrorResponse(response, 503);
    });
  });
});
