import { S3Event } from 'aws-lambda';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const ML_LAMBDA_ARN = process.env.ML_LAMBDA_ARN!;
const RESULTS_BUCKET = process.env.RESULTS_BUCKET_NAME!;

export const handler = async (event: S3Event): Promise<void> => {
  console.log('S3 event received:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    // Only process blueprint uploads
    if (!key.startsWith('blueprints/')) {
      console.log(`Skipping non-blueprint file: ${key}`);
      continue;
    }

    // Extract job ID from key
    const jobId = key.split('/')[1].split('.')[0];

    console.log(`Triggering ML inference for job ${jobId}: s3://${bucket}/${key}`);

    try {
      // Prepare input payload for ML Lambda
      const inputPayload = {
        bucket: bucket,
        key: key,
        jobId: jobId,
        timestamp: new Date().toISOString(),
      };

      // Invoke ML inference Lambda
      const command = new InvokeCommand({
        FunctionName: ML_LAMBDA_ARN,
        InvocationType: 'Event', // Async invocation
        Payload: Buffer.from(JSON.stringify(inputPayload)),
      });

      const response = await lambdaClient.send(command);

      console.log(`ML inference triggered successfully for job ${jobId}:`, {
        statusCode: response.StatusCode,
        requestId: response.$metadata.requestId,
      });
    } catch (error) {
      console.error(`Error triggering ML inference for ${jobId}:`, error);
      throw error;
    }
  }
};
