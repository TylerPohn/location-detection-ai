import { UploadResponse } from '../../types/api';

/**
 * Mock pre-signed upload URL response
 * Simulates AWS S3 pre-signed URL structure
 */
export const createMockUploadResponse = (fileName: string): UploadResponse => {
  const jobId = generateMockJobId();
  const timestamp = Date.now();
  const expiresIn = 3600; // 1 hour in seconds

  return {
    jobId,
    uploadUrl: `https://mock-s3-bucket.s3.us-east-1.amazonaws.com/uploads/${jobId}/${encodeURIComponent(fileName)}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=MOCK_CREDENTIAL&X-Amz-Date=${timestamp}&X-Amz-Expires=${expiresIn}&X-Amz-SignedHeaders=host&X-Amz-Signature=mock_signature_${jobId}`,
    expiresIn,
  };
};

/**
 * Pre-generated mock upload responses for common scenarios
 */
export const mockUploadResponses: Record<string, UploadResponse> = {
  'office-floor.svg': {
    jobId: 'a1b2c3d4-e5f6-4789-a0b1-c2d3e4f5g6h7',
    uploadUrl:
      'https://mock-s3-bucket.s3.us-east-1.amazonaws.com/uploads/a1b2c3d4-e5f6-4789-a0b1-c2d3e4f5g6h7/office-floor.svg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=MOCK_CREDENTIAL&X-Amz-Date=1699364123000&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=mock_signature_office',
    expiresIn: 3600,
  },
  'apartment.svg': {
    jobId: 'b2c3d4e5-f6g7-4890-b1c2-d3e4f5g6h7i8',
    uploadUrl:
      'https://mock-s3-bucket.s3.us-east-1.amazonaws.com/uploads/b2c3d4e5-f6g7-4890-b1c2-d3e4f5g6h7i8/apartment.svg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=MOCK_CREDENTIAL&X-Amz-Date=1699364456000&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=mock_signature_apartment',
    expiresIn: 3600,
  },
  'warehouse.svg': {
    jobId: 'c3d4e5f6-g7h8-4901-c2d3-e4f5g6h7i8j9',
    uploadUrl:
      'https://mock-s3-bucket.s3.us-east-1.amazonaws.com/uploads/c3d4e5f6-g7h8-4901-c2d3-e4f5g6h7i8j9/warehouse.svg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=MOCK_CREDENTIAL&X-Amz-Date=1699364789000&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=mock_signature_warehouse',
    expiresIn: 3600,
  },
};

/**
 * Mock job creation response after successful upload
 */
export interface JobCreationResponse {
  jobId: string;
  status: 'pending';
  message: string;
  estimatedProcessingTime: number; // in seconds
}

export const createMockJobCreationResponse = (jobId: string): JobCreationResponse => {
  return {
    jobId,
    status: 'pending',
    message: 'Blueprint uploaded successfully. Processing will begin shortly.',
    estimatedProcessingTime: Math.floor(Math.random() * 120) + 30, // 30-150 seconds
  };
};

/**
 * Mock error responses for upload failures
 */
export interface UploadErrorResponse {
  error: string;
  code: string;
  statusCode: number;
  details?: string;
}

export const mockUploadErrors: Record<string, UploadErrorResponse> = {
  invalidFileType: {
    error: 'Invalid file type',
    code: 'INVALID_FILE_TYPE',
    statusCode: 400,
    details: 'Only PNG, JPG, SVG, and PDF files are supported',
  },
  fileTooLarge: {
    error: 'File size exceeds limit',
    code: 'FILE_TOO_LARGE',
    statusCode: 413,
    details: 'Maximum file size is 50MB',
  },
  uploadFailed: {
    error: 'Upload failed',
    code: 'UPLOAD_FAILED',
    statusCode: 500,
    details: 'Failed to upload file to storage. Please try again.',
  },
  quotaExceeded: {
    error: 'Upload quota exceeded',
    code: 'QUOTA_EXCEEDED',
    statusCode: 429,
    details: 'You have exceeded your daily upload quota. Please try again tomorrow.',
  },
  unauthorized: {
    error: 'Unauthorized',
    code: 'UNAUTHORIZED',
    statusCode: 401,
    details: 'Please log in to upload blueprints',
  },
};

/**
 * Generate a mock UUID v4
 */
function generateMockJobId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Simulate upload validation
 */
export const validateUpload = (
  file: File
): { valid: boolean; error?: UploadErrorResponse } => {
  // Check file type
  const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'application/pdf'];
  if (!validTypes.includes(file.type)) {
    return { valid: false, error: mockUploadErrors.invalidFileType };
  }

  // Check file size (50MB limit)
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: mockUploadErrors.fileTooLarge };
  }

  return { valid: true };
};

/**
 * Simulate random upload failure (for testing error handling)
 */
export const shouldSimulateUploadFailure = (): boolean => {
  // 10% chance of simulated failure in demo mode
  return Math.random() < 0.1;
};
