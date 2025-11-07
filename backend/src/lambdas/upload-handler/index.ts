import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const BLUEPRINT_BUCKET = process.env.BLUEPRINT_BUCKET_NAME!;
const RESULTS_BUCKET = process.env.RESULTS_BUCKET_NAME!;

interface UploadRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
}

interface UploadResponse {
  jobId: string;
  uploadUrl: string;
  expiresIn: number;
}

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const request: UploadRequest = JSON.parse(event.body);

    // Validate request
    if (!request.fileName || !request.fileType) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'fileName and fileType are required' }),
      };
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf'];
    if (!allowedTypes.includes(request.fileType)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}`,
        }),
      };
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (request.fileSize > maxSize) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'File size exceeds 10MB limit' }),
      };
    }

    // Generate unique job ID
    const jobId = randomUUID();
    const fileExtension = request.fileName.split('.').pop();
    const s3Key = `blueprints/${jobId}.${fileExtension}`;

    // Generate pre-signed URL for upload
    const command = new PutObjectCommand({
      Bucket: BLUEPRINT_BUCKET,
      Key: s3Key,
      ContentType: request.fileType,
      Metadata: {
        jobId: jobId,
        originalFileName: request.fileName,
      },
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    // Prepare response
    const response: UploadResponse = {
      jobId,
      uploadUrl,
      expiresIn: 3600,
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
