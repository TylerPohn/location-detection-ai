import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { requireAuth } from '../../middleware/auth';
import { initializeFirebaseAdmin, setCustomClaims } from '../../utils/firebaseAdmin';

// Initialize Firebase Admin SDK
initializeFirebaseAdmin();

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const USERS_TABLE = process.env.USERS_TABLE_NAME!;
const INVITES_TABLE = process.env.INVITES_TABLE_NAME!;
const JOBS_TABLE = process.env.JOBS_TABLE_NAME!;

interface User {
  userId: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: string;
  invitedBy?: string;
  createdAt: number;
}

interface VerifyInviteRequest {
  inviteCode: string;
}

interface CompleteRegistrationRequest {
  inviteCode: string;
  displayName?: string;
  photoURL?: string;
}

/**
 * Get current user information
 */
async function getCurrentUser(userId: string): Promise<User | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId },
    })
  );

  return result.Item as User | null;
}

/**
 * Get user's job history
 */
async function getUserJobs(userId: string) {
  const result = await docClient.send(
    new QueryCommand({
      TableName: JOBS_TABLE,
      IndexName: 'UserIdIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
      ScanIndexForward: false, // Most recent first
    })
  );

  return result.Items || [];
}

/**
 * Verify invite code is valid
 */
async function verifyInviteCode(inviteCode: string) {
  const result = await docClient.send(
    new QueryCommand({
      TableName: INVITES_TABLE,
      IndexName: 'StatusIndex',
      KeyConditionExpression: '#status = :status',
      FilterExpression: 'inviteCode = :inviteCode',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'pending',
        ':inviteCode': inviteCode,
      },
    })
  );

  if (!result.Items || result.Items.length === 0) {
    return null;
  }

  const invite = result.Items[0];

  // Check if invite has expired
  const now = Math.floor(Date.now() / 1000);
  if (invite.expiresAt < now) {
    return null;
  }

  return invite;
}

/**
 * Complete user registration after Google auth
 */
async function completeRegistration(
  userId: string,
  email: string,
  inviteCode: string,
  displayName?: string,
  photoURL?: string
): Promise<User> {
  // Verify invite
  const invite = await verifyInviteCode(inviteCode);
  if (!invite) {
    throw new Error('Invalid or expired invite code');
  }

  // Verify email matches invite
  if (invite.email !== email) {
    throw new Error('Email does not match invite');
  }

  // Create user record
  const user: User = {
    userId,
    email,
    displayName,
    photoURL,
    role: 'user',
    invitedBy: invite.invitedBy,
    createdAt: Date.now(),
  };

  await docClient.send(
    new PutCommand({
      TableName: USERS_TABLE,
      Item: user,
      ConditionExpression: 'attribute_not_exists(userId)',
    })
  );

  // Set custom claims in Firebase
  await setCustomClaims(userId, { role: 'user' });

  // Mark invite as accepted
  await docClient.send(
    new UpdateCommand({
      TableName: INVITES_TABLE,
      Key: { inviteId: invite.inviteId },
      UpdateExpression: 'SET #status = :status, acceptedAt = :acceptedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'accepted',
        ':acceptedAt': Date.now(),
      },
    })
  );

  return user;
}

/**
 * Lambda handler for user management
 *
 * Routes:
 * - GET /users/me - Get current user info
 * - GET /users/me/jobs - Get user's job history
 * - POST /users/verify-invite - Verify invite code
 * - POST /users/complete-registration - Complete registration
 */
export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  };

  try {
    const method = event.requestContext.http.method;
    const path = event.rawPath;

    // POST /users/verify-invite - Verify invite code (no auth required)
    if (method === 'POST' && path === '/users/verify-invite') {
      if (!event.body) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Request body is required' }),
        };
      }

      const request: VerifyInviteRequest = JSON.parse(event.body);

      if (!request.inviteCode) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invite code is required' }),
        };
      }

      const invite = await verifyInviteCode(request.inviteCode);

      if (!invite) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Invalid or expired invite code' }),
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          valid: true,
          email: invite.email,
        }),
      };
    }

    // All other routes require authentication
    const authResult = await requireAuth(event);
    if ('statusCode' in authResult) {
      return {
        statusCode: authResult.statusCode,
        headers,
        body: JSON.stringify({ error: authResult.message }),
      };
    }

    const user = authResult;

    // GET /users/me - Get current user
    if (method === 'GET' && path === '/users/me') {
      const userData = await getCurrentUser(user.userId);

      if (!userData) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'User not found' }),
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(userData),
      };
    }

    // GET /users/me/jobs - Get user's jobs
    if (method === 'GET' && path === '/users/me/jobs') {
      const jobs = await getUserJobs(user.userId);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ jobs }),
      };
    }

    // POST /users/complete-registration - Complete registration
    if (method === 'POST' && path === '/users/complete-registration') {
      if (!event.body) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Request body is required' }),
        };
      }

      const request: CompleteRegistrationRequest = JSON.parse(event.body);

      if (!request.inviteCode) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invite code is required' }),
        };
      }

      if (!user.email) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Email not found in token' }),
        };
      }

      try {
        const newUser = await completeRegistration(
          user.userId,
          user.email,
          request.inviteCode,
          request.displayName,
          request.photoURL
        );

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify(newUser),
        };
      } catch (error: any) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: error.message }),
        };
      }
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' }),
    };
  } catch (error) {
    console.error('Error handling user request:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
