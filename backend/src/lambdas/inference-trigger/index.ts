import { S3Event } from 'aws-lambda';
import { SageMakerRuntimeClient, InvokeEndpointAsyncCommand } from '@aws-sdk/client-sagemaker-runtime';

const sagemakerClient = new SageMakerRuntimeClient({ region: process.env.AWS_REGION });
const ENDPOINT_NAME = process.env.SAGEMAKER_ENDPOINT_NAME!;
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

    console.log(`Triggering inference for job ${jobId}: s3://${bucket}/${key}`);

    try {
      // Prepare input payload
      const inputPayload = {
        bucket: bucket,
        key: key,
        metadata: {
          jobId: jobId,
          timestamp: new Date().toISOString(),
        },
      };

      // Invoke SageMaker Async Endpoint
      const command = new InvokeEndpointAsyncCommand({
        EndpointName: ENDPOINT_NAME,
        InputLocation: `s3://${bucket}/${key}`,
        ContentType: 'application/json',
        Accept: 'application/json',
        InferenceId: jobId,
      });

      const response = await sagemakerClient.send(command);

      console.log(`Inference triggered successfully:`, response);
      console.log(`Output location: ${response.OutputLocation}`);
    } catch (error) {
      console.error(`Error triggering inference for ${jobId}:`, error);
      throw error;
    }
  }
};
