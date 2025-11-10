// API Service Layer
import { env } from '@/config/env';
import { getIdToken } from './firebase';
import type { UploadRequest, UploadResponse, DetectionResult, ApiError } from '@/types/api';

// TODO: Enable when backend is integrated
// import type {
//   UserProfile,
//   Invite,
//   CreateInviteRequest,
//   VerifyInviteRequest,
//   VerifyInviteResponse,
// } from '@/types/auth';

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = env.apiBaseUrl;
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = await getIdToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let error: ApiError;
      try {
        error = await response.json();
      } catch {
        error = {
          message: 'An error occurred',
          statusCode: response.status,
        };
      }

      const apiError: any = new Error(error.message || 'Request failed');
      apiError.statusCode = error.statusCode || response.status;
      apiError.code = error.code;
      throw apiError;
    }

    return response.json();
  }

  async requestUploadUrl(request: UploadRequest): Promise<UploadResponse> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}/upload`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    return this.handleResponse<UploadResponse>(response);
  }

  async uploadToS3(url: string, file: File, onProgress?: (progress: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = Math.round((e.loaded / e.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('PUT', url);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  }

  async getJobStatus(jobId: string): Promise<DetectionResult> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}/status/${jobId}`, {
      headers,
    });

    return this.handleResponse<DetectionResult>(response);
  }

  async getUserJobs(): Promise<DetectionResult[]> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}/users/me/jobs`, {
      headers,
    });

    const data = await this.handleResponse<{ jobs: DetectionResult[] }>(response);
    return data.jobs;
  }

  // TODO: Enable when backend is integrated
  // User Management
  // async getUserProfile(): Promise<UserProfile> {
  //   const headers = await this.getAuthHeaders();
  //   const response = await fetch(`${this.baseUrl}/users/me`, {
  //     headers,
  //   });
  //
  //   return this.handleResponse<UserProfile>(response);
  // }

  // async getAllUsers(): Promise<UserProfile[]> {
  //   const headers = await this.getAuthHeaders();
  //   const response = await fetch(`${this.baseUrl}/users`, {
  //     headers,
  //   });
  //
  //   return this.handleResponse<UserProfile[]>(response);
  // }

  // Invite Management
  // async createInvite(request: CreateInviteRequest): Promise<Invite> {
  //   const headers = await this.getAuthHeaders();
  //   const response = await fetch(`${this.baseUrl}/invites`, {
  //     method: 'POST',
  //     headers,
  //     body: JSON.stringify(request),
  //   });
  //
  //   return this.handleResponse<Invite>(response);
  // }

  // async getInvites(): Promise<Invite[]> {
  //   const headers = await this.getAuthHeaders();
  //   const response = await fetch(`${this.baseUrl}/invites`, {
  //     headers,
  //   });
  //
  //   return this.handleResponse<Invite[]>(response);
  // }

  // async verifyInvite(request: VerifyInviteRequest): Promise<VerifyInviteResponse> {
  //   const response = await fetch(`${this.baseUrl}/invites/verify`, {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //     },
  //     body: JSON.stringify(request),
  //   });
  //
  //   return this.handleResponse<VerifyInviteResponse>(response);
  // }

  // async revokeInvite(inviteId: string): Promise<void> {
  //   const headers = await this.getAuthHeaders();
  //   const response = await fetch(`${this.baseUrl}/invites/${inviteId}`, {
  //     method: 'DELETE',
  //     headers,
  //   });
  //
  //   if (!response.ok) {
  //     throw new Error('Failed to revoke invite');
  //   }
  // }
}

export const apiService = new ApiService();

// Export individual functions for convenience
export const requestUploadUrl = (request: UploadRequest) => apiService.requestUploadUrl(request);
export const uploadToS3 = (url: string, file: File, onProgress?: (progress: number) => void) =>
  apiService.uploadToS3(url, file, onProgress);
export const getJobStatus = (jobId: string) => apiService.getJobStatus(jobId);
export const getUserJobs = () => apiService.getUserJobs();

// TODO: Enable when backend is integrated
// export const getUserProfile = () => apiService.getUserProfile();
// export const getAllUsers = () => apiService.getAllUsers();
// export const createInvite = (request: CreateInviteRequest) => apiService.createInvite(request);
// export const getInvites = () => apiService.getInvites();
// export const verifyInvite = (request: VerifyInviteRequest) => apiService.verifyInvite(request);
// export const revokeInvite = (inviteId: string) => apiService.revokeInvite(inviteId);
