# Backend Authentication Integration Guide

## Current State: Frontend-Only Auth

The application currently uses **frontend-only Firebase Authentication**. This is sufficient for basic protection of the UI, but doesn't provide server-side authorization features.

## When to Consider Backend Integration

Add backend authentication when you need:

1. **Job Ownership**: Users should only see/access their own uploads
2. **Rate Limiting**: Prevent abuse by limiting uploads per user
3. **Admin Features**: Manage users, view all jobs, moderate content
4. **User Roles**: Different permissions for different user types
5. **Audit Logs**: Track who uploaded what and when
6. **Payment Integration**: Charge users based on usage
7. **Team Features**: Share jobs within organizations

## What Backend Integration Adds

### Without Backend (Current)
- ✅ Users can sign in/sign up
- ✅ Protected UI routes
- ❌ Any authenticated user can see any job
- ❌ No upload limits
- ❌ No admin controls
- ❌ No usage tracking per user

### With Backend Integration
- ✅ Users can only access their own jobs
- ✅ Rate limiting (e.g., 10 uploads per day)
- ✅ Admin dashboard with user management
- ✅ Usage analytics per user
- ✅ Billing integration possible
- ✅ Team/organization support

## Architecture Options

### Option 1: Firebase Auth Token Verification (Recommended)

Your Lambda functions verify Firebase tokens directly:

```typescript
// backend/src/lambdas/upload-handler/index.ts
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
});

export const handler = async (event) => {
  // Get token from Authorization header
  const token = event.headers.Authorization?.replace('Bearer ', '');

  try {
    // Verify the Firebase token
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userId = decodedToken.uid;

    // User is authenticated, proceed with upload
    // Associate job with userId in DynamoDB

  } catch (error) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }
};
```

**Pros:**
- No additional auth service needed
- Direct Firebase integration
- Same auth tokens as frontend

**Cons:**
- Need Firebase Admin SDK in Lambda
- Requires Firebase service account credentials

### Option 2: AWS Cognito Migration

Migrate from Firebase to AWS Cognito for full AWS integration:

**Pros:**
- Native AWS integration
- API Gateway authorizers
- No external dependencies

**Cons:**
- Migration complexity
- Users need to re-register or migrate
- More AWS services to manage

### Option 3: Custom Auth Service

Build a custom authentication service:

**Pros:**
- Full control
- Custom features

**Cons:**
- Most complex
- Security responsibilities
- Maintenance overhead

## Step-by-Step Migration to Backend Auth

### Phase 1: Add User ID to Jobs

**1. Update DynamoDB Schema**

Add `userId` field to jobs table:

```typescript
// infrastructure/lib/storage-stack.ts
const jobsTable = new dynamodb.Table(this, 'JobsTable', {
  partitionKey: { name: 'jobId', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'userId', type: dynamodb.AttributeType.STRING }, // Add this
  // ... rest of config
});

// Add GSI for querying by userId
jobsTable.addGlobalSecondaryIndex({
  indexName: 'UserIdIndex',
  partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
});
```

**2. Install Firebase Admin SDK**

```bash
cd backend/src/lambdas/upload-handler
npm install firebase-admin
```

**3. Update Upload Handler**

```typescript
// backend/src/lambdas/upload-handler/index.ts
import admin from 'firebase-admin';
import { DynamoDB } from 'aws-sdk';

const dynamodb = new DynamoDB.DocumentClient();

// Initialize Firebase Admin (do this once, outside handler)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

export const handler = async (event) => {
  // Verify Firebase token
  const token = event.headers.Authorization?.replace('Bearer ', '');

  if (!token) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'No token provided' }),
    };
  }

  let userId: string;
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    userId = decodedToken.uid;
  } catch (error) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Invalid token' }),
    };
  }

  // Generate job ID
  const jobId = `job-${Date.now()}`;

  // Store job with userId
  await dynamodb.put({
    TableName: process.env.JOBS_TABLE_NAME!,
    Item: {
      jobId,
      userId, // Associate with user
      status: 'pending',
      createdAt: new Date().toISOString(),
    },
  }).promise();

  // Return signed URL for upload
  // ...
};
```

**4. Add Environment Variables**

```bash
# infrastructure/.env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

**5. Update Infrastructure**

```typescript
// infrastructure/lib/lambda-stack.ts
uploadHandler.addEnvironment('FIREBASE_PROJECT_ID', process.env.FIREBASE_PROJECT_ID!);
uploadHandler.addEnvironment('FIREBASE_PRIVATE_KEY', process.env.FIREBASE_PRIVATE_KEY!);
uploadHandler.addEnvironment('FIREBASE_CLIENT_EMAIL', process.env.FIREBASE_CLIENT_EMAIL!);
```

### Phase 2: Filter Jobs by User

**Update Status Handler**

```typescript
// backend/src/lambdas/status-handler/index.ts
export const handler = async (event) => {
  // Verify token
  const decodedToken = await admin.auth().verifyIdToken(token);
  const userId = decodedToken.uid;

  const jobId = event.pathParameters.jobId;

  // Get job
  const result = await dynamodb.get({
    TableName: process.env.JOBS_TABLE_NAME!,
    Key: { jobId, userId },
  }).promise();

  // Check if job exists and belongs to user
  if (!result.Item) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Job not found' }),
    };
  }

  // Return job status
  return {
    statusCode: 200,
    body: JSON.stringify(result.Item),
  };
};
```

### Phase 3: Add Rate Limiting

```typescript
// backend/src/lambdas/upload-handler/index.ts
async function checkRateLimit(userId: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];

  const result = await dynamodb.query({
    TableName: process.env.JOBS_TABLE_NAME!,
    IndexName: 'UserIdIndex',
    KeyConditionExpression: 'userId = :userId AND begins_with(createdAt, :today)',
    ExpressionAttributeValues: {
      ':userId': userId,
      ':today': today,
    },
  }).promise();

  const uploadCount = result.Count || 0;
  const dailyLimit = 10; // Configure as needed

  return uploadCount < dailyLimit;
}

export const handler = async (event) => {
  // ... verify token, get userId ...

  // Check rate limit
  const canUpload = await checkRateLimit(userId);
  if (!canUpload) {
    return {
      statusCode: 429,
      body: JSON.stringify({
        error: 'Rate limit exceeded',
        message: 'You have reached your daily upload limit',
      }),
    };
  }

  // Proceed with upload
  // ...
};
```

### Phase 4: Add Admin Features

**Create Admin Checker**

```typescript
// backend/src/utils/auth.ts
export async function isAdmin(userId: string): Promise<boolean> {
  const user = await admin.auth().getUser(userId);
  return user.customClaims?.admin === true;
}

export async function setAdmin(userId: string, isAdmin: boolean) {
  await admin.auth().setCustomUserClaims(userId, { admin: isAdmin });
}
```

**Create Admin Endpoints**

```typescript
// backend/src/lambdas/admin-handler/index.ts
export const handler = async (event) => {
  // Verify token and check admin
  const decodedToken = await admin.auth().verifyIdToken(token);
  const isUserAdmin = await isAdmin(decodedToken.uid);

  if (!isUserAdmin) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Forbidden' }),
    };
  }

  // Admin operations
  switch (event.httpMethod) {
    case 'GET':
      // List all users
      const users = await admin.auth().listUsers();
      return {
        statusCode: 200,
        body: JSON.stringify(users.users),
      };

    case 'DELETE':
      // Delete user
      const userId = event.pathParameters.userId;
      await admin.auth().deleteUser(userId);
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'User deleted' }),
      };
  }
};
```

## Frontend Changes Required

### Update API Client

```typescript
// frontend/src/api/client.ts
import { auth } from '../config/firebase';

export async function uploadFile(file: File) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  // Get fresh token
  const token = await user.getIdToken();

  const response = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fileName: file.name }),
  });

  return response.json();
}
```

### Update Results Page

```typescript
// frontend/src/pages/ResultsPage.tsx
// Now only shows jobs belonging to the logged-in user
const { data: jobs } = useQuery({
  queryKey: ['user-jobs'],
  queryFn: async () => {
    const token = await auth.currentUser?.getIdToken();
    const response = await fetch(`${API_URL}/jobs`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },
  enabled: !!auth.currentUser,
});
```

## Deployment Checklist

- [ ] Add Firebase service account to AWS Secrets Manager
- [ ] Update Lambda environment variables
- [ ] Deploy updated infrastructure
- [ ] Test token verification
- [ ] Test rate limiting
- [ ] Test job ownership
- [ ] Update frontend API calls
- [ ] Test end-to-end flow

## Cost Considerations

### Firebase Admin SDK
- No additional cost (uses your existing Firebase project)
- Lambda execution time slightly increased for token verification

### DynamoDB
- Additional GSI for userId lookups
- Minimal cost increase

### Lambda
- Slightly longer execution times
- Firebase Admin SDK increases package size

## Security Best Practices

1. **Never expose Firebase private key in code**
   - Use AWS Secrets Manager or environment variables
   - Rotate keys periodically

2. **Always verify tokens on backend**
   - Don't trust client-side authentication
   - Verify every request

3. **Use HTTPS only**
   - Tokens should never be sent over HTTP

4. **Implement rate limiting**
   - Prevent abuse
   - Protect backend resources

5. **Log authentication events**
   - Track failed login attempts
   - Monitor for suspicious activity

## Existing Implementation Files

These files already exist and can be enhanced with backend auth:

- `/backend/src/lambdas/upload-handler/index.ts` - Add token verification
- `/backend/src/lambdas/status-handler/index.ts` - Add ownership check
- `/backend/src/lambdas/inference-trigger/index.ts` - Already processes jobs
- `/infrastructure/lib/storage-stack.ts` - Add userId to schema
- `/infrastructure/lib/lambda-stack.ts` - Add environment variables

## Testing Backend Auth

```bash
# Test token verification
curl -X POST https://your-api.com/upload \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fileName": "test.png"}'

# Should return 401 without token
curl -X POST https://your-api.com/upload \
  -H "Content-Type: application/json" \
  -d '{"fileName": "test.png"}'
```

## Migration Timeline

**Week 1**: Add userId to jobs, update schema
**Week 2**: Implement token verification in upload handler
**Week 3**: Add job ownership checks
**Week 4**: Implement rate limiting
**Week 5**: Add admin features
**Week 6**: Update frontend, testing, deployment

## Conclusion

Backend authentication integration is **optional** but recommended for production applications. Start with the frontend-only approach to validate your application, then add backend features as needed.

The migration path is straightforward and can be done incrementally without breaking existing functionality.
