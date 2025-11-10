import { S3Event } from 'aws-lambda';
import { initializeFirebaseAdmin } from './firebaseAdmin';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
initializeFirebaseAdmin();

export const handler = async (event: S3Event): Promise<void> => {
  console.log('S3 result event received:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = record.s3.object.key;

    console.log(`Processing result file: s3://${bucket}/${key}`);

    // Extract jobId from key: results/{jobId}.json
    const match = key.match(/results\/([^\/]+)\.json$/);
    if (!match) {
      console.log(`Skipping non-result file: ${key}`);
      continue;
    }

    const jobId = match[1];
    console.log(`Updating Firestore status for job: ${jobId}`);

    try {
      // Update job status in Firestore
      await admin
        .firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          status: 'completed',
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
          resultUrl: `s3://${bucket}/${key}`,
        });

      console.log(`✅ Successfully updated job ${jobId} to completed`);
    } catch (error) {
      console.error(`❌ Failed to update job ${jobId}:`, error);
      throw error;
    }
  }
};
