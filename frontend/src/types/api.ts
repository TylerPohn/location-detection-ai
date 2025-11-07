// API type definitions

export interface UploadRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
}

export interface UploadResponse {
  jobId: string;
  uploadUrl: string;
}

export interface Room {
  id: string;
  label: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface DetectionResult {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  imageUrl?: string;
  rooms?: Room[];
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}
