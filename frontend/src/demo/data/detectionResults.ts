import { DetectionResult, Room, Line, Point } from '../../types/api';

/**
 * Mock detection result for office floor plan
 * 9 rooms detected with realistic boundaries and measurements
 */
export const officeFloorDetection: DetectionResult = {
  jobId: 'a1b2c3d4-e5f6-4789-a0b1-c2d3e4f5g6h7',
  status: 'completed',
  progress: 100,
  roomCount: 9,
  rooms: [
    {
      id: 'room-office-1',
      name_hint: 'Conference Room',
      lines: [
        { start: [50, 50], end: [350, 50] },
        { start: [350, 50], end: [350, 250] },
        { start: [350, 250], end: [50, 250] },
        { start: [50, 250], end: [50, 50] },
      ],
      polygon: [[50, 50], [350, 50], [350, 250], [50, 250]],
      area: 60000,
      perimeter: 1200,
    },
    {
      id: 'room-office-2',
      name_hint: 'Office 1',
      lines: [
        { start: [350, 50], end: [550, 50] },
        { start: [550, 50], end: [550, 250] },
        { start: [550, 250], end: [350, 250] },
        { start: [350, 250], end: [350, 50] },
      ],
      polygon: [[350, 50], [550, 50], [550, 250], [350, 250]],
      area: 40000,
      perimeter: 800,
    },
    {
      id: 'room-office-3',
      name_hint: 'Office 2',
      lines: [
        { start: [550, 50], end: [750, 50] },
        { start: [750, 50], end: [750, 250] },
        { start: [750, 250], end: [550, 250] },
        { start: [550, 250], end: [550, 50] },
      ],
      polygon: [[550, 50], [750, 50], [750, 250], [550, 250]],
      area: 40000,
      perimeter: 800,
    },
    {
      id: 'room-office-4',
      name_hint: 'Kitchen',
      lines: [
        { start: [50, 250], end: [250, 250] },
        { start: [250, 250], end: [250, 400] },
        { start: [250, 400], end: [50, 400] },
        { start: [50, 400], end: [50, 250] },
      ],
      polygon: [[50, 250], [250, 250], [250, 400], [50, 400]],
      area: 30000,
      perimeter: 700,
    },
    {
      id: 'room-office-5',
      name_hint: 'Open Workspace',
      lines: [
        { start: [250, 250], end: [750, 250] },
        { start: [750, 250], end: [750, 400] },
        { start: [750, 400], end: [250, 400] },
        { start: [250, 400], end: [250, 250] },
      ],
      polygon: [[250, 250], [750, 250], [750, 400], [250, 400]],
      area: 75000,
      perimeter: 1300,
    },
    {
      id: 'room-office-6',
      name_hint: 'Restroom',
      lines: [
        { start: [50, 400], end: [200, 400] },
        { start: [200, 400], end: [200, 550] },
        { start: [200, 550], end: [50, 550] },
        { start: [50, 550], end: [50, 400] },
      ],
      polygon: [[50, 400], [200, 400], [200, 550], [50, 550]],
      area: 22500,
      perimeter: 600,
    },
    {
      id: 'room-office-7',
      name_hint: 'Storage',
      lines: [
        { start: [200, 400], end: [350, 400] },
        { start: [350, 400], end: [350, 550] },
        { start: [350, 550], end: [200, 550] },
        { start: [200, 550], end: [200, 400] },
      ],
      polygon: [[200, 400], [350, 400], [350, 550], [200, 550]],
      area: 22500,
      perimeter: 600,
    },
    {
      id: 'room-office-8',
      name_hint: 'Server Room',
      lines: [
        { start: [350, 400], end: [550, 400] },
        { start: [550, 400], end: [550, 550] },
        { start: [550, 550], end: [350, 550] },
        { start: [350, 550], end: [350, 400] },
      ],
      polygon: [[350, 400], [550, 400], [550, 550], [350, 550]],
      area: 30000,
      perimeter: 700,
    },
    {
      id: 'room-office-9',
      name_hint: 'Meeting Room',
      lines: [
        { start: [550, 400], end: [750, 400] },
        { start: [750, 400], end: [750, 550] },
        { start: [750, 550], end: [550, 550] },
        { start: [550, 550], end: [550, 400] },
      ],
      polygon: [[550, 400], [750, 400], [750, 550], [550, 550]],
      area: 30000,
      perimeter: 700,
    },
  ],
};

/**
 * Mock detection result for apartment floor plan
 * 9 rooms detected with residential layout
 */
export const apartmentDetection: DetectionResult = {
  jobId: 'b2c3d4e5-f6g7-4890-b1c2-d3e4f5g6h7i8',
  status: 'completed',
  progress: 100,
  roomCount: 9,
  rooms: [
    {
      id: 'room-apt-1',
      name_hint: 'Living Room',
      lines: [
        { start: [50, 50], end: [350, 50] },
        { start: [350, 50], end: [350, 400] },
        { start: [350, 400], end: [50, 400] },
        { start: [50, 400], end: [50, 50] },
      ],
      polygon: [[50, 50], [350, 50], [350, 400], [50, 400]],
      area: 105000,
      perimeter: 1400,
    },
    {
      id: 'room-apt-2',
      name_hint: 'Kitchen',
      lines: [
        { start: [350, 50], end: [550, 50] },
        { start: [550, 50], end: [550, 250] },
        { start: [550, 250], end: [350, 250] },
        { start: [350, 250], end: [350, 50] },
      ],
      polygon: [[350, 50], [550, 50], [550, 250], [350, 250]],
      area: 40000,
      perimeter: 800,
    },
    {
      id: 'room-apt-3',
      name_hint: 'Dining Area',
      lines: [
        { start: [350, 250], end: [550, 250] },
        { start: [550, 250], end: [550, 400] },
        { start: [550, 400], end: [350, 400] },
        { start: [350, 400], end: [350, 250] },
      ],
      polygon: [[350, 250], [550, 250], [550, 400], [350, 400]],
      area: 30000,
      perimeter: 700,
    },
    {
      id: 'room-apt-4',
      name_hint: 'Master Bedroom',
      lines: [
        { start: [50, 400], end: [300, 400] },
        { start: [300, 400], end: [300, 600] },
        { start: [300, 600], end: [50, 600] },
        { start: [50, 600], end: [50, 400] },
      ],
      polygon: [[50, 400], [300, 400], [300, 600], [50, 600]],
      area: 50000,
      perimeter: 900,
    },
    {
      id: 'room-apt-5',
      name_hint: 'Bedroom 2',
      lines: [
        { start: [300, 400], end: [550, 400] },
        { start: [550, 400], end: [550, 600] },
        { start: [550, 600], end: [300, 600] },
        { start: [300, 600], end: [300, 400] },
      ],
      polygon: [[300, 400], [550, 400], [550, 600], [300, 600]],
      area: 50000,
      perimeter: 900,
    },
    {
      id: 'room-apt-6',
      name_hint: 'Bathroom',
      lines: [
        { start: [50, 600], end: [200, 600] },
        { start: [200, 600], end: [200, 750] },
        { start: [200, 750], end: [50, 750] },
        { start: [50, 750], end: [50, 600] },
      ],
      polygon: [[50, 600], [200, 600], [200, 750], [50, 750]],
      area: 22500,
      perimeter: 600,
    },
    {
      id: 'room-apt-7',
      name_hint: 'Hallway',
      lines: [
        { start: [200, 600], end: [300, 600] },
        { start: [300, 600], end: [300, 750] },
        { start: [300, 750], end: [200, 750] },
        { start: [200, 750], end: [200, 600] },
      ],
      polygon: [[200, 600], [300, 600], [300, 750], [200, 750]],
      area: 15000,
      perimeter: 500,
    },
    {
      id: 'room-apt-8',
      name_hint: 'Ensuite',
      lines: [
        { start: [300, 600], end: [430, 600] },
        { start: [430, 600], end: [430, 750] },
        { start: [430, 750], end: [300, 750] },
        { start: [300, 750], end: [300, 600] },
      ],
      polygon: [[300, 600], [430, 600], [430, 750], [300, 750]],
      area: 19500,
      perimeter: 560,
    },
    {
      id: 'room-apt-9',
      name_hint: 'Closet',
      lines: [
        { start: [430, 600], end: [550, 600] },
        { start: [550, 600], end: [550, 750] },
        { start: [550, 750], end: [430, 750] },
        { start: [430, 750], end: [430, 600] },
      ],
      polygon: [[430, 600], [550, 600], [550, 750], [430, 750]],
      area: 18000,
      perimeter: 540,
    },
  ],
};

/**
 * Mock detection result for warehouse floor plan
 * 9 rooms detected with industrial layout
 */
export const warehouseDetection: DetectionResult = {
  jobId: 'c3d4e5f6-g7h8-4901-c2d3-e4f5g6h7i8j9',
  status: 'completed',
  progress: 100,
  roomCount: 9,
  rooms: [
    {
      id: 'room-wh-1',
      name_hint: 'Main Storage Area',
      lines: [
        { start: [50, 50], end: [700, 50] },
        { start: [700, 50], end: [700, 500] },
        { start: [700, 500], end: [50, 500] },
        { start: [50, 500], end: [50, 50] },
      ],
      polygon: [[50, 50], [700, 50], [700, 500], [50, 500]],
      area: 292500,
      perimeter: 2700,
    },
    {
      id: 'room-wh-2',
      name_hint: 'Loading Dock 1',
      lines: [
        { start: [700, 50], end: [950, 50] },
        { start: [950, 50], end: [950, 200] },
        { start: [950, 200], end: [700, 200] },
        { start: [700, 200], end: [700, 50] },
      ],
      polygon: [[700, 50], [950, 50], [950, 200], [700, 200]],
      area: 37500,
      perimeter: 800,
    },
    {
      id: 'room-wh-3',
      name_hint: 'Loading Dock 2',
      lines: [
        { start: [700, 200], end: [950, 200] },
        { start: [950, 200], end: [950, 350] },
        { start: [950, 350], end: [700, 350] },
        { start: [700, 350], end: [700, 200] },
      ],
      polygon: [[700, 200], [950, 200], [950, 350], [700, 350]],
      area: 37500,
      perimeter: 800,
    },
    {
      id: 'room-wh-4',
      name_hint: 'Loading Dock 3',
      lines: [
        { start: [700, 350], end: [950, 350] },
        { start: [950, 350], end: [950, 500] },
        { start: [950, 500], end: [700, 500] },
        { start: [700, 500], end: [700, 350] },
      ],
      polygon: [[700, 350], [950, 350], [950, 500], [700, 500]],
      area: 37500,
      perimeter: 800,
    },
    {
      id: 'room-wh-5',
      name_hint: 'Office',
      lines: [
        { start: [50, 500], end: [250, 500] },
        { start: [250, 500], end: [250, 650] },
        { start: [250, 650], end: [50, 650] },
        { start: [50, 650], end: [50, 500] },
      ],
      polygon: [[50, 500], [250, 500], [250, 650], [50, 650]],
      area: 30000,
      perimeter: 700,
    },
    {
      id: 'room-wh-6',
      name_hint: 'Break Room',
      lines: [
        { start: [250, 500], end: [400, 500] },
        { start: [400, 500], end: [400, 650] },
        { start: [400, 650], end: [250, 650] },
        { start: [250, 650], end: [250, 500] },
      ],
      polygon: [[250, 500], [400, 500], [400, 650], [250, 650]],
      area: 22500,
      perimeter: 600,
    },
    {
      id: 'room-wh-7',
      name_hint: 'Restrooms',
      lines: [
        { start: [400, 500], end: [550, 500] },
        { start: [550, 500], end: [550, 650] },
        { start: [550, 650], end: [400, 650] },
        { start: [400, 650], end: [400, 500] },
      ],
      polygon: [[400, 500], [550, 500], [550, 650], [400, 650]],
      area: 22500,
      perimeter: 600,
    },
    {
      id: 'room-wh-8',
      name_hint: 'Equipment Room',
      lines: [
        { start: [550, 500], end: [700, 500] },
        { start: [700, 500], end: [700, 650] },
        { start: [700, 650], end: [550, 650] },
        { start: [550, 650], end: [550, 500] },
      ],
      polygon: [[550, 500], [700, 500], [700, 650], [550, 650]],
      area: 22500,
      perimeter: 600,
    },
    {
      id: 'room-wh-9',
      name_hint: 'Quality Control',
      lines: [
        { start: [700, 500], end: [950, 500] },
        { start: [950, 500], end: [950, 650] },
        { start: [950, 650], end: [700, 650] },
        { start: [700, 650], end: [700, 500] },
      ],
      polygon: [[700, 500], [950, 500], [950, 650], [700, 650]],
      area: 37500,
      perimeter: 800,
    },
  ],
};

/**
 * All detection results indexed by job ID
 */
export const detectionResultsMap: Record<string, DetectionResult> = {
  'a1b2c3d4-e5f6-4789-a0b1-c2d3e4f5g6h7': officeFloorDetection,
  'b2c3d4e5-f6g7-4890-b1c2-d3e4f5g6h7i8': apartmentDetection,
  'c3d4e5f6-g7h8-4901-c2d3-e4f5g6h7i8j9': warehouseDetection,
};

/**
 * Export all detection results
 */
export const allDetectionResults = [
  officeFloorDetection,
  apartmentDetection,
  warehouseDetection,
];
