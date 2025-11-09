import type { Room, DetectionResult } from '@/types/api';

/**
 * Sample floor plan detection results for demo mode
 */
export const sampleRooms: Room[] = [
  {
    id: 'room-1',
    name_hint: 'Living Room',
    area: 450.5,
    perimeter: 85.2,
    polygon: [
      [100, 100],
      [400, 100],
      [400, 350],
      [100, 350],
    ],
    lines: [
      { start: [100, 100], end: [400, 100] },
      { start: [400, 100], end: [400, 350] },
      { start: [400, 350], end: [100, 350] },
      { start: [100, 350], end: [100, 100] },
    ],
  },
  {
    id: 'room-2',
    name_hint: 'Bedroom',
    area: 320.0,
    perimeter: 72.0,
    polygon: [
      [420, 100],
      [680, 100],
      [680, 320],
      [420, 320],
    ],
    lines: [
      { start: [420, 100], end: [680, 100] },
      { start: [680, 100], end: [680, 320] },
      { start: [680, 320], end: [420, 320] },
      { start: [420, 320], end: [420, 100] },
    ],
  },
  {
    id: 'room-3',
    name_hint: 'Kitchen',
    area: 280.0,
    perimeter: 68.0,
    polygon: [
      [100, 370],
      [400, 370],
      [400, 570],
      [100, 570],
    ],
    lines: [
      { start: [100, 370], end: [400, 370] },
      { start: [400, 370], end: [400, 570] },
      { start: [400, 570], end: [100, 570] },
      { start: [100, 570], end: [100, 370] },
    ],
  },
  {
    id: 'room-4',
    name_hint: 'Bathroom',
    area: 120.0,
    perimeter: 44.0,
    polygon: [
      [420, 340],
      [580, 340],
      [580, 460],
      [420, 460],
    ],
    lines: [
      { start: [420, 340], end: [580, 340] },
      { start: [580, 340], end: [580, 460] },
      { start: [580, 460], end: [420, 460] },
      { start: [420, 460], end: [420, 340] },
    ],
  },
];

/**
 * Demo detection results with different status stages
 */
export const mockDetectionResults: Record<string, DetectionResult> = {
  'demo-job-pending': {
    jobId: 'demo-job-pending',
    status: 'pending',
    progress: 0,
  },
  'demo-job-processing': {
    jobId: 'demo-job-processing',
    status: 'processing',
    progress: 45,
  },
  'demo-job-completed': {
    jobId: 'demo-job-completed',
    status: 'completed',
    progress: 100,
    roomCount: sampleRooms.length,
    rooms: sampleRooms,
  },
  'demo-job-failed': {
    jobId: 'demo-job-failed',
    status: 'failed',
    error: 'Failed to process floor plan image',
  },
};

/**
 * Generate a new demo job ID
 */
export function generateDemoJobId(): string {
  return `demo-job-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate a mock S3 upload URL
 */
export function generateMockUploadUrl(jobId: string): string {
  return `https://mock-s3.amazonaws.com/demo-bucket/${jobId}/floorplan.png?X-Amz-Expires=3600`;
}
