/**
 * Mock data for testing
 *
 * This file contains mock data structures that match the API types
 * for use in unit and integration tests.
 */

export interface Room {
  id: string;
  lines: Array<{ start: [number, number]; end: [number, number] }>;
  polygon: Array<[number, number]>;
  area: number;
  perimeter: number;
  name_hint?: string;
}

export interface DetectionResult {
  jobId: string;
  status: 'processing' | 'completed' | 'failed';
  roomCount?: number;
  rooms?: Room[];
  error?: string;
  progress?: number;
}

export interface UploadResponse {
  jobId: string;
  uploadUrl: string;
  expiresIn: number;
}

// Mock Room Data
export const mockRoom: Room = {
  id: 'room_001',
  lines: [
    { start: [100, 100], end: [400, 100] },
    { start: [400, 100], end: [400, 300] },
    { start: [400, 300], end: [100, 300] },
    { start: [100, 300], end: [100, 100] },
  ],
  polygon: [
    [100, 100],
    [400, 100],
    [400, 300],
    [100, 300],
  ],
  area: 60000,
  perimeter: 800,
  name_hint: 'Office',
};

export const mockRooms: Room[] = [
  mockRoom,
  {
    ...mockRoom,
    id: 'room_002',
    name_hint: 'Kitchen',
    area: 45000,
    polygon: [
      [200, 200],
      [500, 200],
      [500, 400],
      [200, 400],
    ],
  },
  {
    ...mockRoom,
    id: 'room_003',
    name_hint: 'Bathroom',
    area: 20000,
    polygon: [
      [50, 50],
      [200, 50],
      [200, 200],
      [50, 200],
    ],
  },
];

// Mock Detection Results
export const mockDetectionResult: DetectionResult = {
  jobId: 'test-job-123',
  status: 'completed',
  roomCount: 3,
  rooms: mockRooms,
};

export const mockDetectionProcessing: DetectionResult = {
  jobId: 'test-job-456',
  status: 'processing',
  progress: 50,
};

export const mockDetectionFailed: DetectionResult = {
  jobId: 'test-job-789',
  status: 'failed',
  error: 'Processing failed: Invalid image format',
};

// Mock Upload Response
export const mockUploadResponse: UploadResponse = {
  jobId: 'test-job-123',
  uploadUrl: 'https://s3.amazonaws.com/test-bucket/test-key?presigned-params',
  expiresIn: 3600,
};

// Mock File
export const mockBlueprintFile = new File(
  ['mock blueprint image data'],
  'sample-blueprint.png',
  { type: 'image/png' }
);

export const mockInvalidFile = new File(
  ['invalid file data'],
  'invalid-file.txt',
  { type: 'text/plain' }
);

// Factory functions for generating test data
export const createMockRoom = (overrides: Partial<Room> = {}): Room => ({
  ...mockRoom,
  ...overrides,
  id: overrides.id || `room_${Math.random().toString(36).substr(2, 9)}`,
});

export const createMockDetectionResult = (
  overrides: Partial<DetectionResult> = {}
): DetectionResult => ({
  ...mockDetectionResult,
  ...overrides,
  jobId: overrides.jobId || `job_${Math.random().toString(36).substr(2, 9)}`,
});

// Helper to create large datasets for performance testing
export const createMockRoomList = (count: number): Room[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockRoom({
      id: `room_${i.toString().padStart(3, '0')}`,
      name_hint: `Room ${i + 1}`,
    })
  );
};
