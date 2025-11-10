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
  bounding_box: [number, number, number, number]; // [x1, y1, x2, y2]
  name_hint?: string;
  confidence?: number;
  // Legacy polygon fields (optional, not used by YOLO)
  lines?: Line[];
  polygon?: Point[];
  area?: number;
  perimeter?: number;
}

export interface Line {
  start: Point;
  end: Point;
}

export type Point = [number, number];

export interface DetectionResult {
  jobId: string;
  userId: string;
  fileName: string;
  uploadedAt: number;
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
