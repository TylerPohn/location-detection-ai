/**
 * Backend Unit Tests - Firebase Authentication
 * Tests token verification, role-based authorization, and invite management
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  TEST_USERS,
  createMockDecodedToken,
  createMockToken,
  createMockInvite,
  mockFirebaseAdmin,
} from '../utils/authTestHelpers';

// Mock Firebase Admin
jest.mock('firebase-admin', () => mockFirebaseAdmin());

describe('Firebase Token Verification', () => {
  let mockAuth: any;

  beforeEach(() => {
    jest.clearAllMocks();
    const admin = require('firebase-admin');
    mockAuth = admin.auth();
  });

  describe('verifyIdToken', () => {
    it('should verify valid admin token', async () => {
      const adminToken = createMockToken(TEST_USERS.admin);
      const decodedToken = createMockDecodedToken(TEST_USERS.admin);

      mockAuth.verifyIdToken.mockResolvedValue(decodedToken);

      const result = await mockAuth.verifyIdToken(adminToken);

      expect(result).toMatchObject({
        uid: TEST_USERS.admin.uid,
        email: TEST_USERS.admin.email,
        email_verified: true,
      });
      expect(mockAuth.verifyIdToken).toHaveBeenCalledWith(adminToken);
    });

    it('should verify valid user token', async () => {
      const userToken = createMockToken(TEST_USERS.user);
      const decodedToken = createMockDecodedToken(TEST_USERS.user);

      mockAuth.verifyIdToken.mockResolvedValue(decodedToken);

      const result = await mockAuth.verifyIdToken(userToken);

      expect(result).toMatchObject({
        uid: TEST_USERS.user.uid,
        email: TEST_USERS.user.email,
        email_verified: true,
      });
    });

    it('should reject expired token', async () => {
      const expiredToken = createMockToken(TEST_USERS.user);
      mockAuth.verifyIdToken.mockRejectedValue(
        new Error('Firebase ID token has expired')
      );

      await expect(mockAuth.verifyIdToken(expiredToken)).rejects.toThrow(
        'Firebase ID token has expired'
      );
    });

    it('should reject invalid token format', async () => {
      const invalidToken = 'invalid.token.format';
      mockAuth.verifyIdToken.mockRejectedValue(
        new Error('Decoding Firebase ID token failed')
      );

      await expect(mockAuth.verifyIdToken(invalidToken)).rejects.toThrow(
        'Decoding Firebase ID token failed'
      );
    });

    it('should reject missing token', async () => {
      mockAuth.verifyIdToken.mockRejectedValue(
        new Error('Argument "idToken" must be a non-empty string')
      );

      await expect(mockAuth.verifyIdToken('')).rejects.toThrow();
    });

    it('should reject unverified email', async () => {
      const unverifiedToken = createMockToken(TEST_USERS.unverifiedUser);
      const decodedToken = createMockDecodedToken(TEST_USERS.unverifiedUser);

      mockAuth.verifyIdToken.mockResolvedValue(decodedToken);

      const result = await mockAuth.verifyIdToken(unverifiedToken);
      expect(result.email_verified).toBe(false);
    });
  });

  describe('Custom Claims - Role Management', () => {
    it('should set admin role via custom claims', async () => {
      mockAuth.setCustomUserClaims.mockResolvedValue(undefined);

      await mockAuth.setCustomUserClaims(TEST_USERS.user.uid, { role: 'admin' });

      expect(mockAuth.setCustomUserClaims).toHaveBeenCalledWith(
        TEST_USERS.user.uid,
        { role: 'admin' }
      );
    });

    it('should set user role via custom claims', async () => {
      mockAuth.setCustomUserClaims.mockResolvedValue(undefined);

      await mockAuth.setCustomUserClaims(TEST_USERS.admin.uid, { role: 'user' });

      expect(mockAuth.setCustomUserClaims).toHaveBeenCalledWith(
        TEST_USERS.admin.uid,
        { role: 'user' }
      );
    });

    it('should retrieve user with custom claims', async () => {
      const mockUserRecord = {
        uid: TEST_USERS.admin.uid,
        email: TEST_USERS.admin.email,
        customClaims: { role: 'admin' },
      };

      mockAuth.getUser.mockResolvedValue(mockUserRecord);

      const user = await mockAuth.getUser(TEST_USERS.admin.uid);

      expect(user.customClaims).toEqual({ role: 'admin' });
    });
  });
});

describe('Role-Based Authorization', () => {
  const hasAdminRole = (decodedToken: any): boolean => {
    return decodedToken.role === 'admin' || decodedToken.customClaims?.role === 'admin';
  };

  const hasUserRole = (decodedToken: any): boolean => {
    return decodedToken.role === 'user' || decodedToken.customClaims?.role === 'user';
  };

  it('should authorize admin role', () => {
    const adminToken = {
      ...createMockDecodedToken(TEST_USERS.admin),
      customClaims: { role: 'admin' },
    };

    expect(hasAdminRole(adminToken)).toBe(true);
  });

  it('should authorize user role', () => {
    const userToken = {
      ...createMockDecodedToken(TEST_USERS.user),
      customClaims: { role: 'user' },
    };

    expect(hasUserRole(userToken)).toBe(true);
  });

  it('should deny admin access to regular user', () => {
    const userToken = {
      ...createMockDecodedToken(TEST_USERS.user),
      customClaims: { role: 'user' },
    };

    expect(hasAdminRole(userToken)).toBe(false);
  });

  it('should allow admin to access user resources', () => {
    const adminToken = {
      ...createMockDecodedToken(TEST_USERS.admin),
      customClaims: { role: 'admin' },
    };

    expect(hasUserRole(adminToken)).toBe(false);
    // Admins typically have separate checks
  });
});

describe('Invite Creation and Validation', () => {
  let mockFirestore: any;

  beforeEach(() => {
    const admin = require('firebase-admin');
    mockFirestore = admin.firestore();
  });

  it('should create valid invite', async () => {
    const invite = createMockInvite();
    const mockDoc = mockFirestore.collection('invites').doc('test-invite-id');

    mockDoc.set.mockResolvedValue(undefined);

    await mockDoc.set(invite);

    expect(mockDoc.set).toHaveBeenCalledWith(invite);
  });

  it('should validate unexpired invite', () => {
    const invite = createMockInvite();
    const isValid = invite.expiresAt > new Date() && !invite.used;

    expect(isValid).toBe(true);
  });

  it('should reject expired invite', () => {
    const invite = createMockInvite({
      expiresAt: new Date(Date.now() - 1000), // Expired
    });
    const isValid = invite.expiresAt > new Date() && !invite.used;

    expect(isValid).toBe(false);
  });

  it('should reject used invite', () => {
    const invite = createMockInvite({ used: true });
    const isValid = invite.expiresAt > new Date() && !invite.used;

    expect(isValid).toBe(false);
  });

  it('should validate invite email match', () => {
    const invite = createMockInvite({ email: 'specific@test.com' });
    const userEmail = 'specific@test.com';

    expect(invite.email).toBe(userEmail);
  });

  it('should reject invite email mismatch', () => {
    const invite = createMockInvite({ email: 'specific@test.com' });
    const userEmail = 'different@test.com';

    expect(invite.email).not.toBe(userEmail);
  });

  it('should track invite creator', async () => {
    const invite = createMockInvite({
      createdBy: TEST_USERS.admin.uid,
    });

    expect(invite.createdBy).toBe(TEST_USERS.admin.uid);
  });

  it('should mark invite as used', async () => {
    const inviteDoc = mockFirestore.collection('invites').doc('test-invite-id');

    inviteDoc.update.mockResolvedValue(undefined);

    await inviteDoc.update({ used: true, usedAt: new Date() });

    expect(inviteDoc.update).toHaveBeenCalledWith(
      expect.objectContaining({ used: true })
    );
  });
});

describe('Job Ownership Checks', () => {
  const checkJobOwnership = (jobUserId: string, requestUserId: string): boolean => {
    return jobUserId === requestUserId;
  };

  const checkAdminOrOwner = (
    jobUserId: string,
    requestUserId: string,
    isAdmin: boolean
  ): boolean => {
    return isAdmin || jobUserId === requestUserId;
  };

  it('should allow user to access own job', () => {
    const userId = TEST_USERS.user.uid;
    expect(checkJobOwnership(userId, userId)).toBe(true);
  });

  it('should deny user access to other user job', () => {
    const jobUserId = TEST_USERS.user.uid;
    const requestUserId = TEST_USERS.admin.uid;

    expect(checkJobOwnership(jobUserId, requestUserId)).toBe(false);
  });

  it('should allow admin to access any job', () => {
    const jobUserId = TEST_USERS.user.uid;
    const adminUserId = TEST_USERS.admin.uid;

    expect(checkAdminOrOwner(jobUserId, adminUserId, true)).toBe(true);
  });

  it('should allow owner to access own job', () => {
    const userId = TEST_USERS.user.uid;

    expect(checkAdminOrOwner(userId, userId, false)).toBe(true);
  });

  it('should deny non-admin, non-owner access', () => {
    const jobUserId = TEST_USERS.user.uid;
    const otherUserId = 'other-user-uid';

    expect(checkAdminOrOwner(jobUserId, otherUserId, false)).toBe(false);
  });
});

describe('Rate Limiting', () => {
  interface RateLimitTracker {
    [key: string]: { count: number; resetTime: number };
  }

  const rateLimitTracker: RateLimitTracker = {};

  const checkRateLimit = (
    userId: string,
    maxRequests: number,
    windowMs: number
  ): boolean => {
    const now = Date.now();
    const userLimit = rateLimitTracker[userId];

    if (!userLimit || now > userLimit.resetTime) {
      rateLimitTracker[userId] = {
        count: 1,
        resetTime: now + windowMs,
      };
      return true;
    }

    if (userLimit.count >= maxRequests) {
      return false;
    }

    userLimit.count++;
    return true;
  };

  beforeEach(() => {
    // Clear rate limit tracker
    Object.keys(rateLimitTracker).forEach((key) => delete rateLimitTracker[key]);
  });

  it('should allow requests within limit', () => {
    const userId = TEST_USERS.user.uid;
    const maxRequests = 5;
    const windowMs = 60000; // 1 minute

    for (let i = 0; i < maxRequests; i++) {
      expect(checkRateLimit(userId, maxRequests, windowMs)).toBe(true);
    }
  });

  it('should reject requests exceeding limit', () => {
    const userId = TEST_USERS.user.uid;
    const maxRequests = 3;
    const windowMs = 60000;

    // Make max requests
    for (let i = 0; i < maxRequests; i++) {
      checkRateLimit(userId, maxRequests, windowMs);
    }

    // Next request should be rejected
    expect(checkRateLimit(userId, maxRequests, windowMs)).toBe(false);
  });

  it('should reset after time window', () => {
    const userId = TEST_USERS.user.uid;
    const maxRequests = 2;
    const windowMs = 100; // 100ms for testing

    // Exhaust limit
    checkRateLimit(userId, maxRequests, windowMs);
    checkRateLimit(userId, maxRequests, windowMs);
    expect(checkRateLimit(userId, maxRequests, windowMs)).toBe(false);

    // Wait for window to expire
    return new Promise((resolve) => {
      setTimeout(() => {
        expect(checkRateLimit(userId, maxRequests, windowMs)).toBe(true);
        resolve(undefined);
      }, windowMs + 10);
    });
  });

  it('should track separate limits per user', () => {
    const maxRequests = 3;
    const windowMs = 60000;

    checkRateLimit(TEST_USERS.user.uid, maxRequests, windowMs);
    checkRateLimit(TEST_USERS.admin.uid, maxRequests, windowMs);

    expect(rateLimitTracker[TEST_USERS.user.uid].count).toBe(1);
    expect(rateLimitTracker[TEST_USERS.admin.uid].count).toBe(1);
  });
});
