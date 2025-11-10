"use strict";
/**
 * Firebase Authentication Handler
 *
 * Validates Firebase ID tokens and extracts user information.
 */
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
exports.verifyToken = verifyToken;
exports.extractToken = extractToken;
exports.authenticateRequest = authenticateRequest;
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin SDK (singleton)
let firebaseApp;
function initializeFirebase() {
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
        }
        else {
            throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable not set');
        }
    }
}
/**
 * Verify Firebase ID token and extract user info
 */
async function verifyToken(idToken) {
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
    }
    catch (error) {
        console.error('Token verification failed:', error);
        throw new Error(`Invalid authentication token: ${error.message}`);
    }
}
/**
 * Extract token from Authorization header
 */
function extractToken(authHeader) {
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
async function authenticateRequest(headers) {
    const authHeader = headers['authorization'] || headers['Authorization'];
    const token = extractToken(authHeader);
    if (!token) {
        throw new Error('Missing authentication token');
    }
    return await verifyToken(token);
}
