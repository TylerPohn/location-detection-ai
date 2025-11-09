import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { randomBytes } from 'crypto';
import { requireAdmin } from '../../middleware/auth';
import { initializeFirebaseAdmin } from '../../utils/firebaseAdmin';

// Initialize Firebase Admin SDK
initializeFirebaseAdmin();

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const INVITES_TABLE = process.env.INVITES_TABLE_NAME!;

interface CreateInviteRequest {
  email: string;
  expiresInDays?: number;
}

interface Invite {
  inviteId: string;
  inviteCode: string;
  email: string;
  invitedBy: string;
  status: 'pending' | 'accepted' | 'revoked';
  createdAt: number;
  expiresAt: number;
}

/**
 * Generate a unique invite code
 */
function generateInviteCode(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Create a new invite
 */
async function createInvite(
  email: string,
  invitedBy: string,
  expiresInDays: number = 7
): Promise<Invite> {
  const inviteId = randomBytes(16).toString('hex');
  const inviteCode = generateInviteCode();
  const createdAt = Date.now();
  const expiresAt = Math.floor((createdAt + expiresInDays * 24 * 60 * 60 * 1000) / 1000);

  const invite: Invite = {
    inviteId,
    inviteCode,
    email,
    invitedBy,
    status: 'pending',
    createdAt,
    expiresAt,
  };

  await docClient.send(
    new PutCommand({
      TableName: INVITES_TABLE,
      Item: invite,
      ConditionExpression: 'attribute_not_exists(inviteId)',
    })
  );

  return invite;
}

/**
 * List all invites (with optional filtering)
 */
async function listInvites(status?: string): Promise<Invite[]> {
  if (status) {
    // Query by status using GSI
    const result = await docClient.send(
      new QueryCommand({
        TableName: INVITES_TABLE,
        IndexName: 'StatusIndex',
        KeyConditionExpression: '#status = :status',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': status,
        },
        ScanIndexForward: false, // Most recent first
      })
    );
    return result.Items as Invite[];
  }

  // Scan all invites
  const result = await docClient.send(
    new ScanCommand({
      TableName: INVITES_TABLE,
    })
  );

  return result.Items as Invite[];
}

/**
 * Revoke an invite
 */
async function revokeInvite(inviteId: string): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: INVITES_TABLE,
      Key: { inviteId },
      UpdateExpression: 'SET #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'revoked',
      },
      ConditionExpression: 'attribute_exists(inviteId)',
    })
  );
}

/**
 * Lambda handler for invite management
 *
 * Routes:
 * - POST /admin/invites - Create invite
 * - GET /admin/invites - List invites
 * - DELETE /admin/invites/{inviteId} - Revoke invite
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
    // Verify admin authentication
    const authResult = await requireAdmin(event);
    if ('statusCode' in authResult) {
      return {
        statusCode: authResult.statusCode,
        headers,
        body: JSON.stringify({ error: authResult.message }),
      };
    }

    const adminUser = authResult;
    const method = event.requestContext.http.method;
    const path = event.rawPath;

    // POST /admin/invites - Create invite
    if (method === 'POST' && path === '/admin/invites') {
      if (!event.body) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Request body is required' }),
        };
      }

      const request: CreateInviteRequest = JSON.parse(event.body);

      if (!request.email) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Email is required' }),
        };
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(request.email)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid email format' }),
        };
      }

      const invite = await createInvite(
        request.email,
        adminUser.userId,
        request.expiresInDays
      );

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(invite),
      };
    }

    // GET /admin/invites - List invites
    if (method === 'GET' && path === '/admin/invites') {
      const status = event.queryStringParameters?.status;
      const invites = await listInvites(status);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ invites }),
      };
    }

    // DELETE /admin/invites/{inviteId} - Revoke invite
    if (method === 'DELETE' && path.startsWith('/admin/invites/')) {
      const inviteId = event.pathParameters?.inviteId;

      if (!inviteId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invite ID is required' }),
        };
      }

      await revokeInvite(inviteId);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Invite revoked successfully' }),
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' }),
    };
  } catch (error) {
    console.error('Error handling invite request:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
