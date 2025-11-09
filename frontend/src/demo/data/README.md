# Demo Data Documentation

This directory contains comprehensive mock data for the Location Detection AI frontend demo mode.

## Directory Structure

```
demo/
├── assets/
│   └── blueprints/           # SVG floor plan samples
│       ├── office-floor.svg  # 9-room office layout
│       ├── apartment.svg     # 9-room residential layout
│       └── warehouse.svg     # 9-room industrial layout
└── data/
    ├── detectionResults.ts   # Mock room detection results
    ├── jobs.ts              # Mock job states and history
    ├── uploadResponses.ts   # Mock API upload responses
    └── index.ts            # Centralized exports
```

## Data Files

### detectionResults.ts
Contains three complete detection results matching the `DetectionResult` interface:
- **officeFloorDetection**: 9 office rooms with realistic boundaries
- **apartmentDetection**: 9 residential rooms (living room, bedrooms, bathrooms)
- **warehouseDetection**: 9 industrial rooms (storage, loading docks, offices)

Each result includes:
- Job ID (UUID v4 format)
- Room count and detailed room data
- Lines (wall segments) and polygons (room boundaries)
- Area and perimeter measurements
- Room name hints

### jobs.ts
Mock job data covering all states:
- **Completed jobs** (3): Linked to detection results above
- **Processing job** (1): 67% progress on retail store
- **Pending jobs** (2): Waiting to be processed
- **Failed job** (1): Example error handling

Helper functions:
- `getJobsByStatus()`: Filter jobs by state
- `getJobById()`: Retrieve specific job
- `getRecentJobs()`: Get sorted job list
- `jobStats`: Aggregate statistics

### uploadResponses.ts
Mock API responses for file uploads:
- **createMockUploadResponse()**: Generate pre-signed URLs
- **mockUploadResponses**: Pre-built responses for sample blueprints
- **createMockJobCreationResponse()**: Job creation confirmations
- **mockUploadErrors**: Common error scenarios
- **validateUpload()**: Client-side validation simulation

## Usage Examples

### Import Detection Results
```typescript
import {
  officeFloorDetection,
  detectionResultsMap
} from '@/demo/data/detectionResults';

// Get specific result
const result = detectionResultsMap['a1b2c3d4-e5f6-4789-a0b1-c2d3e4f5g6h7'];

// Access room data
const rooms = officeFloorDetection.rooms;
```

### Work with Jobs
```typescript
import {
  mockJobs,
  getJobsByStatus,
  jobStats
} from '@/demo/data/jobs';

// Get completed jobs
const completed = getJobsByStatus('completed');

// Check statistics
console.log(`${jobStats.completed} jobs completed`);
```

### Simulate Uploads
```typescript
import {
  createMockUploadResponse,
  validateUpload,
  mockUploadErrors
} from '@/demo/data/uploadResponses';

// Validate file
const validation = validateUpload(file);
if (!validation.valid) {
  console.error(validation.error);
}

// Generate upload URL
const response = createMockUploadResponse(file.name);
```

## Blueprint Assets

Three SVG floor plans are provided:

### office-floor.svg (800x600px)
- Conference Room
- 2 Private Offices
- Kitchen/Break Room
- Open Workspace
- Restroom, Storage, Server Room, Meeting Room

### apartment.svg (600x800px)
- Living Room
- Kitchen & Dining Area
- 2 Bedrooms (including Master)
- 2 Bathrooms (including Ensuite)
- Hallway & Closet

### warehouse.svg (1000x700px)
- Large Storage Area
- 3 Loading Docks
- Office, Break Room, Restrooms
- Equipment Room, Quality Control

All SVGs render properly and include realistic room layouts with walls, doors, and labels.

## Type Safety

All mock data is fully typed and matches the interfaces in `/src/types/api.ts`:
- `Room`: Room detection results
- `DetectionResult`: Complete job results
- `UploadResponse`: Upload URL responses
- `Job`: Custom job tracking interface

TypeScript validation ensures data integrity across the demo system.

## Integration

The demo data is designed to work seamlessly with:
- MSW (Mock Service Worker) handlers in `/demo/mocks/`
- React Query cache and state management
- Component testing and storybook
- API service layer in `/services/`

## Maintenance

When updating:
1. Ensure all UUIDs remain unique
2. Keep timestamps realistic (relative to Date.now())
3. Maintain consistency between jobs and detection results
4. Validate TypeScript types after changes: `npm run typecheck`
5. Update this README if structure changes
