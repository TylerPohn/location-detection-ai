import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  type Firestore,
} from 'firebase/firestore';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Validate Firebase configuration
const validateFirebaseConfig = () => {
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'appId'];
  const missing = requiredFields.filter((field) => !firebaseConfig[field as keyof typeof firebaseConfig]);

  if (missing.length > 0) {
    console.error('❌ Missing Firebase configuration:', missing.join(', '));
    console.error('Please ensure the following environment variables are set in your .env file:');
    console.error('  - VITE_FIREBASE_API_KEY');
    console.error('  - VITE_FIREBASE_AUTH_DOMAIN');
    console.error('  - VITE_FIREBASE_PROJECT_ID');
    console.error('  - VITE_FIREBASE_APP_ID');
    return false;
  }

  console.log('✅ Firebase configuration loaded successfully');
  console.log('📋 Project ID:', firebaseConfig.projectId);
  console.log('🌐 Auth Domain:', firebaseConfig.authDomain);
  return true;
};

// Initialize Firebase only if config is valid
let auth: ReturnType<typeof getAuth> | null = null;
let googleProvider: GoogleAuthProvider | null = null;
let db: Firestore | null = null;

if (validateFirebaseConfig()) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({
    prompt: 'select_account',
  });
  console.log('🔥 Firebase initialized successfully');
  console.log('📊 Firestore initialized');
} else {
  console.error('🚫 Firebase initialization failed - authentication will not work');
}

/**
 * Sign in with Google
 */
export const signInWithGoogle = async (): Promise<User> => {
  if (!auth || !googleProvider) {
    throw new Error('Firebase is not configured. Please check environment variables.');
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    console.log('✅ Google sign-in successful:', result.user.email);
    return result.user;
  } catch (error: any) {
    console.error('❌ Google sign-in error:', error);
    throw new Error(error.message || 'Failed to sign in with Google');
  }
};

/**
 * Sign out the current user
 */
export const signOut = async (): Promise<void> => {
  if (!auth) {
    throw new Error('Firebase is not configured');
  }

  try {
    await firebaseSignOut(auth);
    console.log('✅ Sign out successful');
  } catch (error: any) {
    console.error('❌ Sign out error:', error);
    throw new Error(error.message || 'Failed to sign out');
  }
};

/**
 * Get the current user's ID token
 */
export const getIdToken = async (): Promise<string | null> => {
  if (!auth?.currentUser) {
    return null;
  }

  try {
    return await auth.currentUser.getIdToken();
  } catch (error) {
    console.error('❌ Failed to get ID token:', error);
    return null;
  }
};

/**
 * Subscribe to auth state changes
 */
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  if (!auth) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(auth, callback);
};

export { auth, db };
export type { User };
