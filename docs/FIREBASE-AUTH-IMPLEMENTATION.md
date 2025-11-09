# Firebase Authentication Implementation

## Overview

This document describes the Firebase authentication infrastructure implementation for the Location Detection AI backend. The implementation includes user management, invite-based registration, and role-based access control.

## Architecture

### Components

1. **DynamoDB Tables**
   - `Users`: Store authenticated user profiles
   - `Invites`: Manage invitation codes for registration
   - `Jobs`: Track blueprint processing jobs per user

2. **Authentication Middleware**
   - Firebase Admin SDK token verification
   - Role-based authorization (admin/user)
   - Resource ownership validation

3. **Lambda Functions**
   - `invite-handler`: Admin-only invite management
   - `user-handler`: User registration and profile management
   - `upload-handler`: Updated with authentication
   - `status-handler`: Updated with job ownership verification

4. **API Gateway Routes**
   - `/admin/invites`: Invite CRUD operations
   - `/users/*`: User profile and registration endpoints
   - `/upload`: Protected blueprint upload
   - `/status/{jobId}`: Protected job status check

## Database Schema

### Users Table

```typescript
{
  userId: string;        // PK - Firebase UID
  email: string;         // GSI partition key
  displayName?: string;
  photoURL?: string;
  role: string;          // 'user' | 'admin'
  invitedBy?: string;    // userId of admin who created invite
  createdAt: number;     // Unix timestamp
}
```

**Global Secondary Indexes:**
- `EmailIndex`: Query users by email

### Invites Table

```typescript
{
  inviteId: string;      // PK
  inviteCode: string;    // Unique 32-char hex string
  email: string;         // GSI partition key
  invitedBy: string;     // userId of admin
  status: string;        // 'pending' | 'accepted' | 'revoked'
  createdAt: number;     // Unix timestamp
  expiresAt: number;     // TTL attribute (Unix timestamp)
}
```

**Global Secondary Indexes:**
- `EmailIndex`: Query invites by email
- `StatusIndex`: Query invites by status + createdAt

### Jobs Table

```typescript
{
  jobId: string;         // PK
  userId: string;        // SK - owner's Firebase UID
  fileName: string;
  fileType: string;
  fileSize: number;
  status: string;        // 'pending' | 'processing' | 'completed' | 'failed'
  uploadedAt: number;    // Unix timestamp
  s3Key: string;
  resultUrl?: string;
}
```

**Global Secondary Indexes:**
- `UserIdIndex`: Query all jobs for a user (PK: userId, SK: uploadedAt)

## API Endpoints

### Admin Endpoints (Require Admin Role)

#### POST /admin/invites
Create a new invitation.

**Request:**
```json
{
  "email": "user@example.com",
  "expiresInDays": 7  // Optional, defaults to 7
}
```

**Response:**
```json
{
  "inviteId": "abc123...",
  "inviteCode": "def456...",
  "email": "user@example.com",
  "invitedBy": "admin-uid",
  "status": "pending",
  "createdAt": 1699999999000,
  "expiresAt": 1700604799
}
```

#### GET /admin/invites
List all invitations.

**Query Parameters:**
- `status`: Filter by status (optional)

**Response:**
```json
{
  "invites": [...]
}
```

#### DELETE /admin/invites/{inviteId}
Revoke an invitation.

**Response:**
```json
{
  "message": "Invite revoked successfully"
}
```

### User Endpoints

#### POST /users/verify-invite
Verify an invite code (no authentication required).

**Request:**
```json
{
  "inviteCode": "def456..."
}
```

**Response:**
```json
{
  "valid": true,
  "email": "user@example.com"
}
```

#### POST /users/complete-registration
Complete user registration after Google authentication.

**Request:**
```json
{
  "inviteCode": "def456...",
  "displayName": "John Doe",  // Optional
  "photoURL": "https://..."   // Optional
}
```

**Headers:**
- `Authorization: Bearer <firebase-id-token>`

**Response:**
```json
{
  "userId": "firebase-uid",
  "email": "user@example.com",
  "displayName": "John Doe",
  "photoURL": "https://...",
  "role": "user",
  "invitedBy": "admin-uid",
  "createdAt": 1699999999000
}
```

#### GET /users/me
Get current user profile.

**Headers:**
- `Authorization: Bearer <firebase-id-token>`

**Response:**
```json
{
  "userId": "firebase-uid",
  "email": "user@example.com",
  "displayName": "John Doe",
  "role": "user",
  "createdAt": 1699999999000
}
```

#### GET /users/me/jobs
Get user's job history.

**Headers:**
- `Authorization: Bearer <firebase-id-token>`

**Response:**
```json
{
  "jobs": [
    {
      "jobId": "job-123",
      "fileName": "blueprint.png",
      "status": "completed",
      "uploadedAt": 1699999999000
    }
  ]
}
```

### Protected Endpoints

#### POST /upload
Upload a blueprint (requires authentication).

**Headers:**
- `Authorization: Bearer <firebase-id-token>`

**Request:**
```json
{
  "fileName": "blueprint.png",
  "fileType": "image/png",
  "fileSize": 1024000
}
```

#### GET /status/{jobId}
Get job status (requires authentication and ownership).

**Headers:**
- `Authorization: Bearer <firebase-id-token>`

## Authentication Flow

### User Registration Flow

1. **Admin creates invite:**
   ```
   POST /admin/invites
   Headers: Authorization: Bearer <admin-token>
   Body: { "email": "user@example.com" }
   ```

2. **User verifies invite code:**
   ```
   POST /users/verify-invite
   Body: { "inviteCode": "abc123..." }
   ```

3. **User signs in with Google (frontend):**
   - Firebase Authentication handles Google OAuth
   - Returns Firebase ID token

4. **User completes registration:**
   ```
   POST /users/complete-registration
   Headers: Authorization: Bearer <firebase-token>
   Body: { "inviteCode": "abc123..." }
   ```

5. **Backend:**
   - Verifies invite code is valid
   - Creates user record in DynamoDB
   - Sets custom claims in Firebase
   - Marks invite as accepted

### API Request Flow

1. **Frontend obtains Firebase ID token:**
   ```typescript
   const token = await firebase.auth().currentUser.getIdToken();
   ```

2. **Frontend sends request:**
   ```typescript
   fetch('/upload', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${token}`,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify(data)
   });
   ```

3. **Backend Lambda:**
   - Extracts token from Authorization header
   - Verifies token with Firebase Admin SDK
   - Checks user role if needed
   - Processes request

## Environment Variables

All Lambda functions require these environment variables:

```bash
# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=base64-encoded-private-key

# DynamoDB Tables
USERS_TABLE_NAME=location-detection-users-development
INVITES_TABLE_NAME=location-detection-invites-development
JOBS_TABLE_NAME=location-detection-jobs-development

# S3 Buckets
BLUEPRINT_BUCKET_NAME=location-detection-blueprints-development
RESULTS_BUCKET_NAME=location-detection-results-development
```

## Deployment

### Prerequisites

1. **Create Firebase project:**
   - Go to https://console.firebase.google.com
   - Create new project
   - Enable Google Authentication

2. **Generate service account:**
   - Project Settings > Service Accounts
   - Generate new private key
   - Download JSON file

3. **Set environment variables:**
   ```bash
   export FIREBASE_PROJECT_ID="your-project-id"
   export FIREBASE_CLIENT_EMAIL="service-account@project.iam.gserviceaccount.com"
   export FIREBASE_PRIVATE_KEY=$(cat service-account.json | jq -r .private_key | base64)
   ```

### CDK Deployment

```bash
cd infrastructure

# Install dependencies
npm install

# Deploy all stacks
cdk deploy --all

# Or deploy individually
cdk deploy LocationDetectionAI-DynamoDB-Development
cdk deploy LocationDetectionAI-Lambda-Development
cdk deploy LocationDetectionAI-Api-Development
```

### Install Lambda Dependencies

```bash
# Upload handler
cd backend/src/lambdas/upload-handler
npm install

# Status handler
cd ../status-handler
npm install

# Invite handler
cd ../invite-handler
npm install

# User handler
cd ../user-handler
npm install
```

## Security Considerations

1. **Token Verification:**
   - All tokens are verified with Firebase Admin SDK
   - Expired or invalid tokens are rejected
   - Custom claims are used for role-based access

2. **CORS Configuration:**
   - Update `allowOrigins` in API Gateway to specific frontend domain
   - Remove wildcard (`*`) in production

3. **Invite Code Security:**
   - 32-character hexadecimal codes (256-bit entropy)
   - Time-limited with TTL
   - Single-use (marked as accepted after use)

4. **Resource Ownership:**
   - Jobs are linked to userId
   - Only owners or admins can access job results
   - Composite key (jobId + userId) prevents unauthorized access

5. **Private Key Storage:**
   - Firebase private key is base64-encoded
   - Stored as environment variable
   - Consider using AWS Secrets Manager for production

## Testing

### Create First Admin User

Since the system requires invites to create users, you'll need to manually create the first admin user in Firebase:

```bash
# 1. Create user in Firebase Console
# 2. Set custom claims using Firebase Admin SDK:

firebase auth:get-user <uid>
firebase auth:set-custom-user-claims <uid> '{"role":"admin"}'

# 3. Add user to DynamoDB Users table:
aws dynamodb put-item \
  --table-name location-detection-users-development \
  --item '{
    "userId": {"S": "<firebase-uid>"},
    "email": {"S": "admin@example.com"},
    "role": {"S": "admin"},
    "createdAt": {"N": "1699999999000"}
  }'
```

### Test Invite Creation

```bash
# Get admin Firebase ID token from frontend
# Then create invite:

curl -X POST https://api.example.com/admin/invites \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

## Files Created

### Infrastructure
- `/Users/tyler/Desktop/Gauntlet/location-detection-ai/infrastructure/lib/dynamodb-stack.ts`
- `/Users/tyler/Desktop/Gauntlet/location-detection-ai/infrastructure/bin/infrastructure.ts` (updated)
- `/Users/tyler/Desktop/Gauntlet/location-detection-ai/infrastructure/lib/lambda-stack.ts` (updated)
- `/Users/tyler/Desktop/Gauntlet/location-detection-ai/infrastructure/lib/api-gateway-stack.ts` (updated)

### Backend Utilities
- `/Users/tyler/Desktop/Gauntlet/location-detection-ai/backend/src/utils/firebaseAdmin.ts`
- `/Users/tyler/Desktop/Gauntlet/location-detection-ai/backend/src/middleware/auth.ts`

### Lambda Functions
- `/Users/tyler/Desktop/Gauntlet/location-detection-ai/backend/src/lambdas/invite-handler/index.ts`
- `/Users/tyler/Desktop/Gauntlet/location-detection-ai/backend/src/lambdas/invite-handler/package.json`
- `/Users/tyler/Desktop/Gauntlet/location-detection-ai/backend/src/lambdas/user-handler/index.ts`
- `/Users/tyler/Desktop/Gauntlet/location-detection-ai/backend/src/lambdas/user-handler/package.json`
- `/Users/tyler/Desktop/Gauntlet/location-detection-ai/backend/src/lambdas/upload-handler/index.ts` (updated)
- `/Users/tyler/Desktop/Gauntlet/location-detection-ai/backend/src/lambdas/upload-handler/package.json` (updated)
- `/Users/tyler/Desktop/Gauntlet/location-detection-ai/backend/src/lambdas/status-handler/index.ts` (updated)
- `/Users/tyler/Desktop/Gauntlet/location-detection-ai/backend/src/lambdas/status-handler/package.json` (updated)

## Next Steps

1. **Frontend Integration:**
   - Add Firebase client SDK
   - Implement Google authentication
   - Add invite code verification UI
   - Update API calls to include Authorization header

2. **Admin Dashboard:**
   - Create admin panel for invite management
   - Add user management UI
   - Display system statistics

3. **Enhanced Security:**
   - Move Firebase credentials to AWS Secrets Manager
   - Implement rate limiting
   - Add request logging and monitoring
   - Set up CloudWatch alarms

4. **Testing:**
   - Add unit tests for auth middleware
   - Add integration tests for invite flow
   - Add E2E tests for complete registration flow
