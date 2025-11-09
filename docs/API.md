# Location Detection AI - API Documentation

## Base URL

```
Production: https://api.location-detection.example.com
Development: https://dev-api.location-detection.example.com
Local: http://localhost:3001
```

## Authentication

All API endpoints (except `/health`) require Firebase Authentication.

### Authentication Flow

1. **Sign in with Google** (frontend)
2. **Get ID token** from Firebase
3. **Include token** in `Authorization` header

### Authorization Header Format

```
Authorization: Bearer <FIREBASE_ID_TOKEN>
```

### Getting ID Token (Frontend)

```javascript
import { getAuth } from 'firebase/auth';

const auth = getAuth();
const idToken = await auth.currentUser.getIdToken();
```

### Token Lifecycle

- **Expiration**: 1 hour
- **Refresh**: Automatic in Firebase SDK
- **Force Refresh**: `getIdToken(true)`

### Error Responses

**401 Unauthorized** - Missing or invalid token:
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing authentication token"
  }
}
```

**403 Forbidden** - Insufficient permissions:
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Admin access required"
  }
}
```

**401 Unauthorized** - Token verification failed:
```json
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Invalid authentication token: Token expired"
  }
}
```

## Rate Limiting

Upload rate limits are enforced per user, per day:

- **Regular Users**: 50 uploads/day
- **Admin Users**: Unlimited
- **Anonymous**: Not allowed (authentication required)

### Rate Limit Response Headers

```
X-RateLimit-Limit: 50
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 2025-11-08T00:00:00Z
```

### Rate Limit Exceeded (429 Too Many Requests)

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Upload limit exceeded. You have used 50 of 50 uploads today.",
    "details": {
      "currentCount": 50,
      "limit": 50,
      "resetTime": "2025-11-08T00:00:00Z"
    }
  }
}
```

### Checking Your Usage

Use `GET /users/me` to see your current upload count and limits.

## Error Handling

### Standard Error Response

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional context"
    },
    "requestId": "uuid-v4",
    "timestamp": "2025-11-07T17:00:00Z"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Request validation failed |
| `FILE_TOO_LARGE` | 400 | File exceeds maximum size (10MB) |
| `INVALID_FILE_TYPE` | 400 | File type not supported |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `INVALID_TOKEN` | 401 | Authentication token invalid/expired |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `JOB_NOT_FOUND` | 404 | Detection job not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Upload rate limit exceeded |
| `PROCESSING_ERROR` | 500 | Error during image processing |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

## Endpoints

### Health Check

Check API health and status.

**Endpoint**: `GET /health`

**Response**:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2025-11-07T17:00:00Z",
  "services": {
    "database": "healthy",
    "sagemaker": "healthy",
    "s3": "healthy"
  }
}
```

---

### Request Upload URL

Request a presigned URL for uploading a blueprint image.

**Endpoint**: `POST /api/upload`

**Authentication**: Required (Firebase ID token)

**Headers**:
```
Authorization: Bearer <FIREBASE_ID_TOKEN>
Content-Type: application/json
```

**Request Body**:
```json
{
  "fileName": "floor-plan.png",
  "fileType": "image/png",
  "fileSize": 1234567
}
```

**Validation**:
- `fileName`: Required, max 255 characters
- `fileType`: Required, must be `image/png`, `image/jpeg`, or `application/pdf`
- `fileSize`: Required, max 10MB (10485760 bytes)

**Success Response** (200 OK):
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "uploadUrl": "https://s3.amazonaws.com/blueprints/presigned-url?...",
  "expiresIn": 3600,
  "createdAt": "2025-11-07T17:00:00Z"
}
```

**Response Fields**:
- `jobId`: Unique identifier for this detection job (UUID v4)
- `uploadUrl`: Presigned S3 URL for uploading the file (expires in 1 hour)
- `expiresIn`: Seconds until upload URL expires
- `createdAt`: ISO 8601 timestamp of job creation

**Error Response** (400 Bad Request):
```json
{
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File size exceeds maximum allowed size of 10MB",
    "details": {
      "maxSize": 10485760,
      "providedSize": 15000000
    }
  }
}
```

**Example**:
```bash
# Get ID token from frontend first
ID_TOKEN="eyJhbGciOiJSUzI1NiIsImtpZCI6..."

curl -X POST https://api.location-detection.example.com/api/upload \
  -H "Authorization: Bearer $ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "office-floor-plan.png",
    "fileType": "image/png",
    "fileSize": 2500000
  }'
```

---

### Upload File to S3

Upload the file to the presigned URL received from `/api/upload`.

**Endpoint**: `PUT <uploadUrl>`

**Headers**:
```
Content-Type: image/png
Content-Length: <file size>
```

**Body**: Binary file data

**Success Response** (200 OK):
```
(Empty response body)
```

**Example**:
```bash
curl -X PUT "https://s3.amazonaws.com/blueprints/presigned-url?..." \
  -H "Content-Type: image/png" \
  --upload-file floor-plan.png
```

**Note**: After successful upload, the detection process starts automatically.

---

### Get Job Status

Check the status and results of a detection job.

**Endpoint**: `GET /api/status/{jobId}`

**Path Parameters**:
- `jobId`: UUID of the detection job

**Headers**: None required

**Success Response - Processing** (200 OK):
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "progress": 45,
  "createdAt": "2025-11-07T17:00:00Z",
  "updatedAt": "2025-11-07T17:00:30Z",
  "estimatedTimeRemaining": 120
}
```

**Success Response - Completed** (200 OK):
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "roomCount": 5,
  "totalArea": 2500.5,
  "createdAt": "2025-11-07T17:00:00Z",
  "completedAt": "2025-11-07T17:02:15Z",
  "processingTime": 135,
  "rooms": [
    {
      "id": "room_001",
      "name_hint": "Office",
      "area": 500.25,
      "perimeter": 90.5,
      "polygon": [
        [100, 100],
        [400, 100],
        [400, 350],
        [100, 350]
      ],
      "lines": [
        {
          "start": [100, 100],
          "end": [400, 100]
        },
        {
          "start": [400, 100],
          "end": [400, 350]
        },
        {
          "start": [400, 350],
          "end": [100, 350]
        },
        {
          "start": [100, 350],
          "end": [100, 100]
        }
      ],
      "center": [250, 225],
      "confidence": 0.95
    }
  ],
  "metadata": {
    "imageWidth": 1024,
    "imageHeight": 768,
    "scale": "1:100",
    "detectionModel": "v1.0.0"
  }
}
```

**Success Response - Failed** (200 OK):
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "failed",
  "error": {
    "code": "PROCESSING_ERROR",
    "message": "Unable to detect rooms in the provided image",
    "details": "Image quality too low or no room boundaries detected"
  },
  "createdAt": "2025-11-07T17:00:00Z",
  "failedAt": "2025-11-07T17:01:00Z"
}
```

**Error Response** (404 Not Found):
```json
{
  "error": {
    "code": "JOB_NOT_FOUND",
    "message": "Detection job not found",
    "details": {
      "jobId": "550e8400-e29b-41d4-a716-446655440000"
    }
  }
}
```

**Status Values**:
- `pending`: Job created, waiting to start
- `processing`: Detection in progress
- `completed`: Detection completed successfully
- `failed`: Detection failed

**Example**:
```bash
curl -X GET https://api.location-detection.example.com/api/status/550e8400-e29b-41d4-a716-446655440000
```

---

### Download Results

Download detection results as JSON file.

**Endpoint**: `GET /api/results/{jobId}/download`

**Path Parameters**:
- `jobId`: UUID of the detection job

**Query Parameters**:
- `format`: Output format (`json` | `csv` | `geojson`) - default: `json`

**Success Response** (200 OK):
```
Content-Type: application/json
Content-Disposition: attachment; filename="detection-results-{jobId}.json"
```

**Example**:
```bash
curl -X GET https://api.location-detection.example.com/api/results/550e8400-e29b-41d4-a716-446655440000/download \
  -o results.json
```

---

### List Jobs

List all detection jobs (with pagination).

**Endpoint**: `GET /api/jobs`

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `status`: Filter by status (`pending` | `processing` | `completed` | `failed`)
- `sortBy`: Sort field (`createdAt` | `completedAt` | `status`) - default: `createdAt`
- `order`: Sort order (`asc` | `desc`) - default: `desc`

**Success Response** (200 OK):
```json
{
  "data": [
    {
      "jobId": "550e8400-e29b-41d4-a716-446655440000",
      "status": "completed",
      "roomCount": 5,
      "createdAt": "2025-11-07T17:00:00Z",
      "completedAt": "2025-11-07T17:02:15Z"
    },
    {
      "jobId": "660e8400-e29b-41d4-a716-446655440001",
      "status": "processing",
      "progress": 60,
      "createdAt": "2025-11-07T16:55:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

**Example**:
```bash
curl -X GET "https://api.location-detection.example.com/api/jobs?status=completed&limit=10"
```

---

### Delete Job

Delete a detection job and its associated data.

**Endpoint**: `DELETE /api/jobs/{jobId}`

**Path Parameters**:
- `jobId`: UUID of the detection job

**Success Response** (204 No Content):
```
(Empty response body)
```

**Error Response** (404 Not Found):
```json
{
  "error": {
    "code": "JOB_NOT_FOUND",
    "message": "Detection job not found"
  }
}
```

**Example**:
```bash
curl -X DELETE https://api.location-detection.example.com/api/jobs/550e8400-e29b-41d4-a716-446655440000
```

---

## Data Models

### Room Object

```typescript
interface Room {
  id: string;                    // Unique room identifier
  name_hint?: string;             // Suggested room name (e.g., "Office")
  area: number;                   // Area in square pixels
  perimeter: number;              // Perimeter in pixels
  polygon: [number, number][];    // Polygon vertices (x, y coordinates)
  lines: Line[];                  // Room boundary lines
  center: [number, number];       // Center point (x, y)
  confidence: number;             // Detection confidence (0-1)
}
```

### Line Object

```typescript
interface Line {
  start: [number, number];        // Start point (x, y)
  end: [number, number];          // End point (x, y)
  length?: number;                // Line length in pixels
  angle?: number;                 // Angle in degrees
}
```

### Detection Result

```typescript
interface DetectionResult {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  roomCount?: number;
  totalArea?: number;
  rooms?: Room[];
  metadata?: {
    imageWidth: number;
    imageHeight: number;
    scale?: string;
    detectionModel: string;
  };
  error?: {
    code: string;
    message: string;
    details?: string;
  };
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  failedAt?: string;
  processingTime?: number;        // Seconds
}
```

## Webhooks (Future Feature)

Subscribe to job status updates via webhooks.

**Endpoint**: `POST /api/webhooks`

**Request Body**:
```json
{
  "url": "https://your-app.com/webhooks/detection",
  "events": ["job.completed", "job.failed"],
  "secret": "your-webhook-secret"
}
```

**Webhook Payload**:
```json
{
  "event": "job.completed",
  "timestamp": "2025-11-07T17:02:15Z",
  "data": {
    "jobId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "roomCount": 5
  },
  "signature": "sha256-hash-of-payload"
}
```

## SDK Examples

### JavaScript/TypeScript

```typescript
import { LocationDetectionClient } from '@location-detection/sdk';

const client = new LocationDetectionClient({
  baseUrl: 'https://api.location-detection.example.com'
});

// Upload and detect
const job = await client.upload(file);
console.log('Job ID:', job.jobId);

// Poll for results
const result = await client.waitForCompletion(job.jobId, {
  pollInterval: 5000,
  timeout: 300000
});

console.log('Detected rooms:', result.rooms);
```

### Python

```python
from location_detection import LocationDetectionClient

client = LocationDetectionClient(
    base_url='https://api.location-detection.example.com'
)

# Upload and detect
job = client.upload('floor-plan.png')
print(f'Job ID: {job.job_id}')

# Wait for results
result = client.wait_for_completion(
    job.job_id,
    poll_interval=5,
    timeout=300
)

print(f'Detected rooms: {len(result.rooms)}')
```

### cURL

```bash
#!/bin/bash

API_URL="https://api.location-detection.example.com"
FILE_PATH="floor-plan.png"

# 1. Request upload URL
RESPONSE=$(curl -s -X POST "${API_URL}/api/upload" \
  -H "Content-Type: application/json" \
  -d "{
    \"fileName\": \"$(basename $FILE_PATH)\",
    \"fileType\": \"image/png\",
    \"fileSize\": $(wc -c < $FILE_PATH)
  }")

JOB_ID=$(echo $RESPONSE | jq -r '.jobId')
UPLOAD_URL=$(echo $RESPONSE | jq -r '.uploadUrl')

echo "Job ID: $JOB_ID"

# 2. Upload file
curl -X PUT "$UPLOAD_URL" \
  -H "Content-Type: image/png" \
  --upload-file "$FILE_PATH"

# 3. Poll for results
while true; do
  STATUS_RESPONSE=$(curl -s "${API_URL}/api/status/${JOB_ID}")
  STATUS=$(echo $STATUS_RESPONSE | jq -r '.status')

  echo "Status: $STATUS"

  if [ "$STATUS" = "completed" ]; then
    echo "Results:"
    echo $STATUS_RESPONSE | jq '.rooms'
    break
  elif [ "$STATUS" = "failed" ]; then
    echo "Detection failed:"
    echo $STATUS_RESPONSE | jq '.error'
    break
  fi

  sleep 5
done
```

## Performance Considerations

### Timeouts
- Upload URL expires in 1 hour
- Detection typically completes in 30-180 seconds
- Maximum processing time: 5 minutes

### Best Practices
1. **Upload Optimization**: Compress images before upload (PNG or JPEG)
2. **Polling**: Use exponential backoff when polling for results
3. **Caching**: Cache results on your end to avoid redundant requests
4. **Error Handling**: Implement retry logic with exponential backoff
5. **File Size**: Keep files under 10MB for optimal performance

### Rate Limits
- Respect rate limits to avoid throttling
- Implement request queuing for batch operations
- Use webhooks instead of polling when available

## Versioning

The API uses URL versioning. Current version: `v1`

Future endpoints will be under `/v2/...` while maintaining backward compatibility.

## Support

- **Documentation**: https://docs.location-detection.example.com
- **API Status**: https://status.location-detection.example.com
- **Support Email**: support@location-detection.example.com
- **GitHub Issues**: https://github.com/your-org/location-detection-ai/issues

---

**API Version**: 1.0.0
**Last Updated**: 2025-11-07
