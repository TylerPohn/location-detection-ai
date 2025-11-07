import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { S3Client, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const BLUEPRINT_BUCKET = process.env.BLUEPRINT_BUCKET_NAME!;
const RESULTS_BUCKET = process.env.RESULTS_BUCKET_NAME!;

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
  try {
    const jobId = event.pathParameters?.jobId;

    if (!jobId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'jobId is required' }),
      };
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

    const response: StatusResponse = {
      jobId,
      status,
      ...(result && { result }),
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error checking status:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
