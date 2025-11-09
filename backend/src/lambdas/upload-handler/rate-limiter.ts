/**
 * Rate Limiter for Upload Handler
 *
 * Tracks uploads per user per day in DynamoDB.
 * Default limits:
 *   - Regular users: 50 uploads/day
 *   - Admin users: Unlimited
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand
} from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const RATE_LIMIT_TABLE = process.env.RATE_LIMIT_TABLE_NAME || 'LocationDetection-RateLimits-development';
const USERS_TABLE = process.env.USERS_TABLE_NAME || 'LocationDetection-Users-development';

// Default rate limits
const DEFAULT_USER_LIMIT = 50; // uploads per day
const ADMIN_LIMIT = Infinity; // unlimited for admins

interface RateLimitRecord {
  userId: string;
  date: string; // YYYY-MM-DD format
  uploadCount: number;
  firstUpload: string;
  lastUpload: string;
  ttl: number; // DynamoDB TTL (auto-delete after 7 days)
}

interface UserRecord {
  userId: string;
  email: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
}

/**
 * Get current date in YYYY-MM-DD format (UTC)
 */
function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get TTL timestamp (7 days from now)
 */
function getTTL(): number {
  return Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);
}

/**
 * Check if user is an admin
 */
async function isAdmin(userId: string): Promise<boolean> {
  try {
    const command = new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId },
    });

    const result = await docClient.send(command);
    const user = result.Item as UserRecord | undefined;

    return user?.role === 'admin' && user?.status === 'active';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Get current upload count for user today
 */
async function getUploadCount(userId: string): Promise<number> {
  const date = getCurrentDate();
  const key = `${userId}#${date}`;

  try {
    const command = new GetCommand({
      TableName: RATE_LIMIT_TABLE,
      Key: { userId: key },
    });

    const result = await docClient.send(command);
    const record = result.Item as RateLimitRecord | undefined;

    return record?.uploadCount || 0;
  } catch (error) {
    console.error('Error getting upload count:', error);
    return 0;
  }
}

/**
 * Increment upload count for user
 */
async function incrementUploadCount(userId: string): Promise<number> {
  const date = getCurrentDate();
  const key = `${userId}#${date}`;
  const now = new Date().toISOString();

  try {
    // Try to increment existing record
    const updateCommand = new UpdateCommand({
      TableName: RATE_LIMIT_TABLE,
      Key: { userId: key },
      UpdateExpression: 'SET uploadCount = if_not_exists(uploadCount, :zero) + :inc, lastUpload = :now, #ttl = :ttl',
      ExpressionAttributeNames: {
        '#ttl': 'ttl',
      },
      ExpressionAttributeValues: {
        ':zero': 0,
        ':inc': 1,
        ':now': now,
        ':ttl': getTTL(),
      },
      ReturnValues: 'ALL_NEW',
    });

    const result = await docClient.send(updateCommand);
    return (result.Attributes?.uploadCount as number) || 1;
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      // Table doesn't exist yet, create initial record
      const putCommand = new PutCommand({
        TableName: RATE_LIMIT_TABLE,
        Item: {
          userId: key,
          date,
          uploadCount: 1,
          firstUpload: now,
          lastUpload: now,
          ttl: getTTL(),
        } as RateLimitRecord,
      });

      await docClient.send(putCommand);
      return 1;
    }

    console.error('Error incrementing upload count:', error);
    throw error;
  }
}

/**
 * Check if user has exceeded rate limit
 */
export async function checkRateLimit(userId: string): Promise<{
  allowed: boolean;
  currentCount: number;
  limit: number;
  resetTime?: string;
}> {
  try {
    // Check if user is admin (unlimited uploads)
    const adminStatus = await isAdmin(userId);
    if (adminStatus) {
      return {
        allowed: true,
        currentCount: 0,
        limit: ADMIN_LIMIT,
      };
    }

    // Get current upload count
    const currentCount = await getUploadCount(userId);
    const limit = DEFAULT_USER_LIMIT;

    // Check if limit exceeded
    if (currentCount >= limit) {
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);

      return {
        allowed: false,
        currentCount,
        limit,
        resetTime: tomorrow.toISOString(),
      };
    }

    return {
      allowed: true,
      currentCount,
      limit,
    };
  } catch (error) {
    console.error('Error checking rate limit:', error);
    // Fail open (allow request) to prevent blocking users due to errors
    return {
      allowed: true,
      currentCount: 0,
      limit: DEFAULT_USER_LIMIT,
    };
  }
}

/**
 * Record an upload (increment counter)
 */
export async function recordUpload(userId: string): Promise<void> {
  try {
    await incrementUploadCount(userId);
  } catch (error) {
    console.error('Error recording upload:', error);
    // Don't throw - we don't want to block uploads if rate limiting fails
  }
}
