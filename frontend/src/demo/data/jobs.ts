import { DetectionResult } from '../../types/api';

export interface Job {
  jobId: string;
  fileName: string;
  fileSize: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
  blueprintPath?: string;
}

/**
 * Mock jobs with various states
 */
export const mockJobs: Job[] = [
  // Completed jobs (map to detection results)
  {
    jobId: 'a1b2c3d4-e5f6-4789-a0b1-c2d3e4f5g6h7',
    fileName: 'office-floor.svg',
    fileSize: 45823,
    status: 'completed',
    progress: 100,
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    updatedAt: new Date(Date.now() - 3500000).toISOString(),
    completedAt: new Date(Date.now() - 3500000).toISOString(),
    blueprintPath: '/src/demo/assets/blueprints/office-floor.svg',
  },
  {
    jobId: 'b2c3d4e5-f6g7-4890-b1c2-d3e4f5g6h7i8',
    fileName: 'apartment.svg',
    fileSize: 38491,
    status: 'completed',
    progress: 100,
    createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    updatedAt: new Date(Date.now() - 7100000).toISOString(),
    completedAt: new Date(Date.now() - 7100000).toISOString(),
    blueprintPath: '/src/demo/assets/blueprints/apartment.svg',
  },
  {
    jobId: 'c3d4e5f6-g7h8-4901-c2d3-e4f5g6h7i8j9',
    fileName: 'warehouse.svg',
    fileSize: 52134,
    status: 'completed',
    progress: 100,
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 24 hours ago
    updatedAt: new Date(Date.now() - 86300000).toISOString(),
    completedAt: new Date(Date.now() - 86300000).toISOString(),
    blueprintPath: '/src/demo/assets/blueprints/warehouse.svg',
  },
  // Processing job
  {
    jobId: 'd4e5f6g7-h8i9-4012-d3e4-f5g6h7i8j9k0',
    fileName: 'retail-store.png',
    fileSize: 128450,
    status: 'processing',
    progress: 67,
    createdAt: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
    updatedAt: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
  },
  // Pending job
  {
    jobId: 'e5f6g7h8-i9j0-4123-e4f5-g6h7i8j9k0l1',
    fileName: 'hospital-wing.pdf',
    fileSize: 245780,
    status: 'pending',
    progress: 0,
    createdAt: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
    updatedAt: new Date(Date.now() - 120000).toISOString(),
  },
  // Failed job
  {
    jobId: 'f6g7h8i9-j0k1-4234-f5g6-h7i8j9k0l1m2',
    fileName: 'corrupted-file.jpg',
    fileSize: 98234,
    status: 'failed',
    progress: 0,
    createdAt: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
    updatedAt: new Date(Date.now() - 1750000).toISOString(),
    error: 'Invalid file format: Unable to detect floor plan structure',
  },
  // Another completed job
  {
    jobId: 'g7h8i9j0-k1l2-4345-g6h7-i8j9k0l1m2n3',
    fileName: 'school-layout.png',
    fileSize: 156723,
    status: 'completed',
    progress: 100,
    createdAt: new Date(Date.now() - 172800000).toISOString(), // 48 hours ago
    updatedAt: new Date(Date.now() - 172700000).toISOString(),
    completedAt: new Date(Date.now() - 172700000).toISOString(),
  },
  // Another pending job
  {
    jobId: 'h8i9j0k1-l2m3-4456-h7i8-j9k0l1m2n3o4',
    fileName: 'stadium-seating.svg',
    fileSize: 89012,
    status: 'pending',
    progress: 0,
    createdAt: new Date(Date.now() - 30000).toISOString(), // 30 seconds ago
    updatedAt: new Date(Date.now() - 30000).toISOString(),
  },
];

/**
 * Get jobs by status
 */
export const getJobsByStatus = (status: Job['status']): Job[] => {
  return mockJobs.filter((job) => job.status === status);
};

/**
 * Get job by ID
 */
export const getJobById = (jobId: string): Job | undefined => {
  return mockJobs.find((job) => job.jobId === jobId);
};

/**
 * Get recent jobs (sorted by createdAt descending)
 */
export const getRecentJobs = (limit: number = 10): Job[] => {
  return [...mockJobs]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
};

/**
 * Statistics about jobs
 */
export const jobStats = {
  total: mockJobs.length,
  completed: getJobsByStatus('completed').length,
  processing: getJobsByStatus('processing').length,
  pending: getJobsByStatus('pending').length,
  failed: getJobsByStatus('failed').length,
};
