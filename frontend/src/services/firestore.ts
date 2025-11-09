import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  query,
  where,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { UserProfile, UserRole, Job, JobStatus } from '@/types/auth';

/**
 * Create a new user profile in Firestore
 */
export const createUserProfile = async (
  userId: string,
  email: string,
  displayName: string | null,
  photoURL: string | null,
  role: UserRole
): Promise<void> => {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      uid: userId,
      email,
      displayName,
      photoURL,
      role,
      createdAt: serverTimestamp(),
    });
    console.log('✅ User profile created:', userId, role);
  } catch (error) {
    console.error('❌ Failed to create user profile:', error);
    throw new Error('Failed to create user profile');
  }
};

/**
 * Get user profile from Firestore
 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      return {
        uid: data.uid,
        email: data.email,
        displayName: data.displayName,
        photoURL: data.photoURL,
        role: data.role,
        createdAt: data.createdAt,
      } as UserProfile;
    }

    return null;
  } catch (error) {
    console.error('❌ Failed to get user profile:', error);
    throw new Error('Failed to get user profile');
  }
};

/**
 * Update user role (admin only - client-side check)
 */
export const updateUserRole = async (userId: string, role: UserRole): Promise<void> => {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { role });
    console.log('✅ User role updated:', userId, role);
  } catch (error) {
    console.error('❌ Failed to update user role:', error);
    throw new Error('Failed to update user role');
  }
};

/**
 * Get all users (admin only - client-side check)
 */
export const getAllUsers = async (): Promise<UserProfile[]> => {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        uid: data.uid,
        email: data.email,
        displayName: data.displayName,
        photoURL: data.photoURL,
        role: data.role,
        createdAt: data.createdAt,
      } as UserProfile;
    });
  } catch (error) {
    console.error('❌ Failed to get all users:', error);
    throw new Error('Failed to get all users');
  }
};

/**
 * Create a new job in Firestore
 */
export const createJob = async (
  jobId: string,
  userId: string,
  fileName: string
): Promise<void> => {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  try {
    const jobRef = doc(db, 'jobs', jobId);
    await setDoc(jobRef, {
      jobId,
      userId,
      fileName,
      status: 'pending' as JobStatus,
      uploadedAt: serverTimestamp(),
    });
    console.log('✅ Job created:', jobId);
  } catch (error) {
    console.error('❌ Failed to create job:', error);
    throw new Error('Failed to create job');
  }
};

/**
 * Get all jobs (admin only - client-side check)
 */
export const getAllJobs = async (): Promise<Job[]> => {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  try {
    const jobsRef = collection(db, 'jobs');
    const snapshot = await getDocs(jobsRef);
    
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        jobId: data.jobId,
        userId: data.userId,
        fileName: data.fileName,
        status: data.status,
        uploadedAt: data.uploadedAt,
        resultUrl: data.resultUrl,
      } as Job;
    });
  } catch (error) {
    console.error('❌ Failed to get all jobs:', error);
    throw new Error('Failed to get all jobs');
  }
};

/**
 * Get jobs for a specific user
 */
export const getUserJobs = async (userId: string): Promise<Job[]> => {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  try {
    const jobsRef = collection(db, 'jobs');
    const q = query(jobsRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        jobId: data.jobId,
        userId: data.userId,
        fileName: data.fileName,
        status: data.status,
        uploadedAt: data.uploadedAt,
        resultUrl: data.resultUrl,
      } as Job;
    });
  } catch (error) {
    console.error('❌ Failed to get user jobs:', error);
    throw new Error('Failed to get user jobs');
  }
};
