import * as admin from 'firebase-admin';

/**
 * Firebase Admin SDK Utilities
 *
 * Provides centralized Firebase Admin SDK initialization and helper functions
 * for user management and authentication.
 */

let firebaseApp: admin.app.App | undefined;

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
export function initializeFirebaseAdmin(): admin.app.App {
  if (firebaseApp) {
    return firebaseApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing Firebase Admin SDK credentials. ' +
      'Ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set.'
    );
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
export function getAuth(): admin.auth.Auth {
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
export async function verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
  const auth = getAuth();
  return auth.verifyIdToken(idToken);
}

/**
 * Get user by UID
 *
 * @param uid - Firebase user UID
 * @returns User record
 */
export async function getUserByUid(uid: string): Promise<admin.auth.UserRecord> {
  const auth = getAuth();
  return auth.getUser(uid);
}

/**
 * Get user by email
 *
 * @param email - User email address
 * @returns User record
 */
export async function getUserByEmail(email: string): Promise<admin.auth.UserRecord> {
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
export async function createUser(
  email: string,
  password: string,
  displayName?: string
): Promise<admin.auth.UserRecord> {
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
export async function setCustomClaims(
  uid: string,
  claims: Record<string, any>
): Promise<void> {
  const auth = getAuth();
  await auth.setCustomUserClaims(uid, claims);
}

/**
 * Delete a user
 *
 * @param uid - Firebase user UID
 */
export async function deleteUser(uid: string): Promise<void> {
  const auth = getAuth();
  await auth.deleteUser(uid);
}
