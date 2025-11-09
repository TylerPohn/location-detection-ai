import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { requireAuth } from '../../middleware/auth';
import { initializeFirebaseAdmin } from '../../utils/firebaseAdmin';

// Initialize Firebase Admin SDK
initializeFirebaseAdmin();

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const BLUEPRINT_BUCKET = process.env.BLUEPRINT_BUCKET_NAME!;
const RESULTS_BUCKET = process.env.RESULTS_BUCKET_NAME!;
const JOBS_TABLE = process.env.JOBS_TABLE_NAME!;

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
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  };

  try {
    // Verify authentication
    const authResult = await requireAuth(event);
    if ('statusCode' in authResult) {
      return {
        statusCode: authResult.statusCode,
        headers,
        body: JSON.stringify({ error: authResult.message }),
      };
    }

    const user = authResult;

    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
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

    // Create job record in DynamoDB
    await docClient.send(
      new PutCommand({
        TableName: JOBS_TABLE,
        Item: {
          jobId,
          userId: user.userId,
          fileName: request.fileName,
          fileType: request.fileType,
          fileSize: request.fileSize,
          status: 'pending',
          uploadedAt: Date.now(),
          s3Key,
        },
      })
    );

    // Prepare response
    const response: UploadResponse = {
      jobId,
      uploadUrl,
      expiresIn: 3600,
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
