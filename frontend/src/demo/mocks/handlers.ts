import { http, HttpResponse, delay } from 'msw';
import type { UploadRequest, UploadResponse, DetectionResult } from '@/types/api';
import {
  mockDetectionResults,
  generateDemoJobId,
  generateMockUploadUrl,
  sampleRooms,
} from '../data/sampleResults';

/**
 * In-memory storage for tracking job status progression in demo mode
 */
const jobStatusStore = new Map<string, DetectionResult>();

/**
 * Simulate job status progression: pending → processing → completed
 */
function simulateJobProgression(jobId: string): void {
  // Start with pending status
  jobStatusStore.set(jobId, {
    jobId,
    status: 'pending',
    progress: 0,
  });

  // After 1 second, move to processing
  setTimeout(() => {
    jobStatusStore.set(jobId, {
      jobId,
      status: 'processing',
      progress: 35,
    });
  }, 1000);

  // After 2 more seconds, increase progress
  setTimeout(() => {
    jobStatusStore.set(jobId, {
      jobId,
      status: 'processing',
      progress: 65,
    });
  }, 3000);

  // After 2 more seconds, complete the job
  setTimeout(() => {
    jobStatusStore.set(jobId, {
      jobId,
      status: 'completed',
      progress: 100,
      roomCount: sampleRooms.length,
      rooms: sampleRooms,
    });
  }, 5000);
}

/**
 * MSW Request Handlers for API mocking
 */
export const handlers = [
  /**
   * POST /upload - Request presigned upload URL
   * Returns: jobId and uploadUrl
   */
  http.post('*/upload', async ({ request }) => {
    // Simulate network delay
    await delay(500);

    try {
      const body = (await request.json()) as UploadRequest;

      // Validate request
      if (!body.fileName || !body.fileType) {
        return HttpResponse.json(
          {
            message: 'Invalid request: fileName and fileType are required',
            code: 'INVALID_REQUEST',
            statusCode: 400,
          },
          { status: 400 }
        );
      }

      // Generate demo job ID
      const jobId = generateDemoJobId();
      const uploadUrl = generateMockUploadUrl(jobId);

      // Initialize job progression
      simulateJobProgression(jobId);

      const response: UploadResponse = {
        jobId,
        uploadUrl,
        expiresIn: 3600,
      };

      return HttpResponse.json(response, { status: 200 });
    } catch (error) {
      return HttpResponse.json(
        {
          message: 'Failed to parse request body',
          code: 'PARSE_ERROR',
          statusCode: 400,
        },
        { status: 400 }
      );
    }
  }),

  /**
   * PUT to S3 - Mock S3 upload
   * Simulates successful file upload
   */
  http.put('https://mock-s3.amazonaws.com/*', async () => {
    // Simulate upload time
    await delay(1000);
    return new HttpResponse(null, { status: 200 });
  }),

  /**
   * GET /status/:jobId - Get job status
   * Returns: job status and progress
   */
  http.get('*/status/:jobId', async ({ params }) => {
    const { jobId } = params;
    await delay(300);

    // Check in-memory store first (for jobs created in this session)
    if (jobStatusStore.has(jobId as string)) {
      const result = jobStatusStore.get(jobId as string)!;
      return HttpResponse.json(result, { status: 200 });
    }

    // Check predefined mock results (for testing different states)
    if (mockDetectionResults[jobId as string]) {
      return HttpResponse.json(mockDetectionResults[jobId as string], { status: 200 });
    }

    // Job not found
    return HttpResponse.json(
      {
        message: `Job ${jobId} not found`,
        code: 'JOB_NOT_FOUND',
        statusCode: 404,
      },
      { status: 404 }
    );
  }),

  /**
   * GET /results/:jobId - Get detection results
   * Returns: completed detection results with rooms
   */
  http.get('*/results/:jobId', async ({ params }) => {
    const { jobId } = params;
    await delay(400);

    // Check in-memory store
    const storedResult = jobStatusStore.get(jobId as string);
    if (storedResult && storedResult.status === 'completed') {
      return HttpResponse.json(storedResult, { status: 200 });
    }

    // Check predefined results
    const mockResult = mockDetectionResults[jobId as string];
    if (mockResult && mockResult.status === 'completed') {
      return HttpResponse.json(mockResult, { status: 200 });
    }

    // Results not available yet
    if (storedResult && storedResult.status !== 'completed') {
      return HttpResponse.json(
        {
          message: 'Job is not completed yet',
          code: 'JOB_NOT_COMPLETED',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Job not found
    return HttpResponse.json(
      {
        message: `Results for job ${jobId} not found`,
        code: 'RESULTS_NOT_FOUND',
        statusCode: 404,
      },
      { status: 404 }
    );
  }),
];
