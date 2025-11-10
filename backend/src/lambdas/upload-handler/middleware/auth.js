"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = verifyToken;
exports.requireAuth = requireAuth;
exports.requireAdmin = requireAdmin;
exports.hasRole = hasRole;
exports.isOwnerOrAdmin = isOwnerOrAdmin;
const firebaseAdmin_1 = require("../utils/firebaseAdmin");
/**
 * Extract token from Authorization header
 *
 * Supports formats:
 * - Bearer <token>
 * - <token>
 *
 * @param event - API Gateway event
 * @returns Token string or null
 */
function extractToken(event) {
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    if (!authHeader) {
        return null;
    }
    // Handle "Bearer <token>" format
    if (authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    // Handle raw token
    return authHeader;
}
/**
 * Verify Firebase authentication token
 *
 * Validates the Firebase ID token and returns user information.
 *
 * @param event - API Gateway event
 * @returns Authenticated user object or auth error
 */
async function verifyToken(event) {
    const token = extractToken(event);
    if (!token) {
        return {
            statusCode: 401,
            message: 'Missing authentication token',
        };
    }
    try {
        const decodedToken = await (0, firebaseAdmin_1.verifyIdToken)(token);
        return {
            userId: decodedToken.uid,
            email: decodedToken.email,
            role: decodedToken.role || 'user',
            emailVerified: decodedToken.email_verified || false,
        };
    }
    catch (error) {
        console.error('Token verification failed:', error);
        return {
            statusCode: 401,
            message: 'Invalid or expired authentication token',
        };
    }
}
/**
 * Require authentication middleware
 *
 * Verifies that the request contains a valid Firebase token.
 * Returns user info if authenticated, or error response if not.
 *
 * Usage in Lambda handler:
 * ```typescript
 * const authResult = await requireAuth(event);
 * if ('statusCode' in authResult) {
 *   return {
 *     statusCode: authResult.statusCode,
 *     body: JSON.stringify({ error: authResult.message }),
 *   };
 * }
 * const user = authResult;
 * ```
 *
 * @param event - API Gateway event
 * @returns Authenticated user or error
 */
async function requireAuth(event) {
    return verifyToken(event);
}
/**
 * Require admin role middleware
 *
 * Verifies authentication and checks for admin role.
 *
 * Usage in Lambda handler:
 * ```typescript
 * const authResult = await requireAdmin(event);
 * if ('statusCode' in authResult) {
 *   return {
 *     statusCode: authResult.statusCode,
 *     body: JSON.stringify({ error: authResult.message }),
 *   };
 * }
 * const adminUser = authResult;
 * ```
 *
 * @param event - API Gateway event
 * @returns Authenticated admin user or error
 */
async function requireAdmin(event) {
    const authResult = await verifyToken(event);
    if ('statusCode' in authResult) {
        return authResult;
    }
    if (authResult.role !== 'admin') {
        return {
            statusCode: 403,
            message: 'Insufficient permissions. Admin role required.',
        };
    }
    return authResult;
}
/**
 * Check if user has specific role
 *
 * @param user - Authenticated user
 * @param requiredRole - Required role name
 * @returns True if user has the role
 */
function hasRole(user, requiredRole) {
    return user.role === requiredRole;
}
/**
 * Check if user owns a resource
 *
 * Utility function to verify resource ownership.
 *
 * @param user - Authenticated user
 * @param resourceOwnerId - User ID of resource owner
 * @returns True if user owns the resource or is admin
 */
function isOwnerOrAdmin(user, resourceOwnerId) {
    return user.userId === resourceOwnerId || user.role === 'admin';
}
