export interface UploadRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
}

export interface UploadResponse {
  jobId: string;
  uploadUrl: string;
  expiresIn: number;
}

export interface Room {
  id: string;
  lines: Line[];
  polygon: Point[];
  area: number;
  perimeter: number;
  name_hint?: string;
}

export interface Line {
  start: Point;
  end: Point;
}

export type Point = [number, number];

export interface DetectionResult {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  roomCount?: number;
  rooms?: Room[];
  error?: string;
}

export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
}
