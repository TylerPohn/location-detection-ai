/**
 * Demo data index - centralized exports for all mock data
 */

// Detection results
export {
  officeFloorDetection,
  apartmentDetection,
  warehouseDetection,
  detectionResultsMap,
  allDetectionResults,
} from './detectionResults';

// Jobs
export {
  mockJobs,
  getJobsByStatus,
  getJobById,
  getRecentJobs,
  jobStats,
  type Job,
} from './jobs';

// Upload responses
export {
  createMockUploadResponse,
  mockUploadResponses,
  createMockJobCreationResponse,
  mockUploadErrors,
  validateUpload,
  shouldSimulateUploadFailure,
  type JobCreationResponse,
  type UploadErrorResponse,
} from './uploadResponses';

// Blueprint paths
export const blueprintPaths = {
  office: '/src/demo/assets/blueprints/office-floor.svg',
  apartment: '/src/demo/assets/blueprints/apartment.svg',
  warehouse: '/src/demo/assets/blueprints/warehouse.svg',
} as const;
