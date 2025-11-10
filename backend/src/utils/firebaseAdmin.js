"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeFirebaseAdmin = initializeFirebaseAdmin;
exports.getAuth = getAuth;
exports.verifyIdToken = verifyIdToken;
exports.getUserByUid = getUserByUid;
exports.getUserByEmail = getUserByEmail;
exports.createUser = createUser;
exports.setCustomClaims = setCustomClaims;
exports.deleteUser = deleteUser;
const admin = __importStar(require("firebase-admin"));
/**
 * Firebase Admin SDK Utilities
 *
 * Provides centralized Firebase Admin SDK initialization and helper functions
 * for user management and authentication.
 */
let firebaseApp;
/**
 * Initialize Firebase Admin SDK
 *
 * Uses service account credentials from environment variables.
 * Should be called once at application startup.
 *
 * Environment variables required:
 * - FIREBASE_PROJECT_ID: Firebase project ID
 * - FIREBASE_CLIENT_EMAIL: Service account email
 * - FIREBASE_PRIVATE_KEY: Service account private key (base64 encoded)
 */
function initializeFirebaseAdmin() {
    if (firebaseApp) {
        return firebaseApp;
    }
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Missing Firebase Admin SDK credentials. ' +
            'Ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set.');
    }
    // Decode base64 private key
    const decodedPrivateKey = Buffer.from(privateKey, 'base64').toString('utf-8');
    firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: decodedPrivateKey,
        }),
    });
    return firebaseApp;
}
/**
 * Get Firebase Admin Auth instance
 */
function getAuth() {
    if (!firebaseApp) {
        initializeFirebaseAdmin();
    }
    return admin.auth();
}
/**
 * Verify Firebase ID token
 *
 * @param idToken - Firebase ID token from client
 * @returns Decoded token with user information
 */
async function verifyIdToken(idToken) {
    const auth = getAuth();
    return auth.verifyIdToken(idToken);
}
/**
 * Get user by UID
 *
 * @param uid - Firebase user UID
 * @returns User record
 */
async function getUserByUid(uid) {
    const auth = getAuth();
    return auth.getUser(uid);
}
/**
 * Get user by email
 *
 * @param email - User email address
 * @returns User record
 */
async function getUserByEmail(email) {
    const auth = getAuth();
    return auth.getUserByEmail(email);
}
/**
 * Create a new Firebase user
 *
 * @param email - User email
 * @param password - User password
 * @param displayName - User display name
 * @returns Created user record
 */
async function createUser(email, password, displayName) {
    const auth = getAuth();
    return auth.createUser({
        email,
        password,
        displayName,
        emailVerified: false,
    });
}
/**
 * Set custom user claims (for role-based access control)
 *
 * @param uid - Firebase user UID
 * @param claims - Custom claims object (e.g., { role: 'admin' })
 */
async function setCustomClaims(uid, claims) {
    const auth = getAuth();
    await auth.setCustomUserClaims(uid, claims);
}
/**
 * Delete a user
 *
 * @param uid - Firebase user UID
 */
async function deleteUser(uid) {
    const auth = getAuth();
    await auth.deleteUser(uid);
}
