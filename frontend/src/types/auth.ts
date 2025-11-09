import { Timestamp } from 'firebase/firestore';

export type UserRole = 'student' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  createdAt: Timestamp;
}

export interface Invite {
  id: string;
  email: string;
  code: string;
  createdAt: string;
  usedAt?: string;
  usedBy?: string;
  revokedAt?: string;
  status: 'pending' | 'used' | 'revoked';
}

export interface CreateInviteRequest {
  email: string;
}

export interface VerifyInviteRequest {
  code: string;
  email: string;
}

export interface VerifyInviteResponse {
  valid: boolean;
  message?: string;
}

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Job {
  jobId: string;
  userId: string;
  fileName: string;
  status: JobStatus;
  uploadedAt: Timestamp;
  resultUrl?: string;
}
