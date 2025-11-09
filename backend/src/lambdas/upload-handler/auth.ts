/**
 * Firebase Authentication Handler
 *
 * Validates Firebase ID tokens and extracts user information.
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK (singleton)
let firebaseApp: admin.app.App;

function initializeFirebase(): void {
  if (!firebaseApp) {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH;
    const projectId = process.env.FIREBASE_PROJECT_ID;

    if (!serviceAccountPath || !projectId) {
      throw new Error('Firebase configuration missing. Set FIREBASE_SERVICE_ACCOUNT_KEY_PATH and FIREBASE_PROJECT_ID.');
    }

    // In Lambda, the service account key should be stored in Secrets Manager or S3
    // For now, we'll use an environment variable for the JSON key
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountKey) {
      const serviceAccount = JSON.parse(serviceAccountKey);
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId,
      });
    } else {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable not set');
    }
  }
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
}

/**
 * Verify Firebase ID token and extract user info
 */
export async function verifyToken(idToken: string): Promise<AuthenticatedUser> {
  try {
    // Initialize Firebase if not already done
    initializeFirebase();

    // Verify the ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    return {
      userId: decodedToken.uid,
      email: decodedToken.email || '',
      emailVerified: decodedToken.email_verified || false,
      name: decodedToken.name,
      picture: decodedToken.picture,
    };
  } catch (error: any) {
    console.error('Token verification failed:', error);
    throw new Error(`Invalid authentication token: ${error.message}`);
  }
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader?: string): string | null {
  if (!authHeader) {
    return null;
  }

  // Expected format: "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  }

  return null;
}

/**
 * Authenticate request and return user info
 */
export async function authenticateRequest(
  headers: Record<string, string | undefined>
): Promise<AuthenticatedUser> {
  const authHeader = headers['authorization'] || headers['Authorization'];
  const token = extractToken(authHeader);

  if (!token) {
    throw new Error('Missing authentication token');
  }

  return await verifyToken(token);
}
