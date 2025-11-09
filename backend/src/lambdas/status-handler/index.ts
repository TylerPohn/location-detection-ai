import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { S3Client, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { requireAuth, isOwnerOrAdmin } from '../../middleware/auth';
import { initializeFirebaseAdmin } from '../../utils/firebaseAdmin';

// Initialize Firebase Admin SDK
initializeFirebaseAdmin();

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const BLUEPRINT_BUCKET = process.env.BLUEPRINT_BUCKET_NAME!;
const RESULTS_BUCKET = process.env.RESULTS_BUCKET_NAME!;
const JOBS_TABLE = process.env.JOBS_TABLE_NAME!;

interface StatusResponse {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: any;
  error?: string;
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

    const jobId = event.pathParameters?.jobId;

    if (!jobId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'jobId is required' }),
      };
    }

    // Get job from DynamoDB to verify ownership
    const jobResult = await docClient.send(
      new GetCommand({
        TableName: JOBS_TABLE,
        Key: { jobId, userId: user.userId },
      })
    );

    const job = jobResult.Item;

    // If job not found with user's ID, check if user is admin
    if (!job) {
      // Try to get job without userId constraint (for admin check)
      const adminJobResult = await docClient.send(
        new GetCommand({
          TableName: JOBS_TABLE,
          Key: { jobId, userId: jobResult.Item?.userId || '' },
        })
      );

      if (!adminJobResult.Item) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Job not found' }),
        };
      }

      // Verify user is admin or owner
      if (!isOwnerOrAdmin(user, adminJobResult.Item.userId)) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Access denied' }),
        };
      }
    }

    // Check if blueprint exists
    let blueprintExists = false;
    try {
      const fileExtensions = ['png', 'jpg', 'jpeg', 'pdf'];
      for (const ext of fileExtensions) {
        try {
          await s3Client.send(
            new HeadObjectCommand({
              Bucket: BLUEPRINT_BUCKET,
              Key: `blueprints/${jobId}.${ext}`,
            })
          );
          blueprintExists = true;
          break;
        } catch (e) {
          // Try next extension
        }
      }
    } catch (error) {
      // Blueprint not found
    }

    if (!blueprintExists) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Job not found' }),
      };
    }

    // Check if results exist
    const resultsKey = `results/${jobId}.json`;
    let status: StatusResponse['status'] = 'processing';
    let result;

    try {
      const resultObject = await s3Client.send(
        new GetObjectCommand({
          Bucket: RESULTS_BUCKET,
          Key: resultsKey,
        })
      );

      const resultBody = await resultObject.Body?.transformToString();
      if (resultBody) {
        result = JSON.parse(resultBody);
        status = 'completed';
      }
    } catch (error) {
      // Results not ready yet
      status = 'processing';
    }

    // Flatten the result and transform to match frontend expectations
    const response: StatusResponse = {
      jobId,
      status,
      ...(result && {
        roomCount: result.room_count,
        rooms: result.rooms?.map((room: any) => ({
          id: room.id.toString(),
          polygon: room.vertices?.map((v: any) => [v.x, v.y]) || [],
          area: room.area || 0,
          perimeter: 0, // Calculate if needed
          lines: [], // Calculate if needed
          bounding_box: room.bounding_box,
          confidence: room.confidence,
        })),
        imageShape: result.image_shape,
        timestamp: result.timestamp,
      }),
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error checking status:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
