# Admin Guide

This guide covers administrative tasks for the Location Detection AI application.

## Table of Contents

1. [Creating the First Admin](#creating-the-first-admin)
2. [Managing User Invites](#managing-user-invites)
3. [User Management](#user-management)
4. [Access Control](#access-control)
5. [Monitoring and Analytics](#monitoring-and-analytics)
6. [Troubleshooting](#troubleshooting)

## Creating the First Admin

The first admin user must be created manually using the bootstrap script.

### Prerequisites

- AWS CLI configured with appropriate credentials
- DynamoDB Users table deployed
- Node.js 18+ installed

### Steps

1. **Navigate to project root**:
   ```bash
   cd /path/to/location-detection-ai
   ```

2. **Install dependencies** (if not already done):
   ```bash
   cd scripts
   npm install
   ```

3. **Set environment variables**:
   ```bash
   export AWS_REGION=us-east-1
   export USERS_TABLE_NAME=LocationDetection-Users-development
   ```

4. **Run the bootstrap script**:
   ```bash
   npm run create-admin admin@yourcompany.com
   ```

5. **Verify output**:
   ```
   ✅ Admin user created successfully!

   User Details:
     User ID: 550e8400-e29b-41d4-a716-446655440000
     Email: admin@yourcompany.com
     Role: admin
     Status: active
     Created: 2025-01-08T12:00:00.000Z

   📧 The user can now sign in with Google using this email address.
   ```

6. **Sign in to verify**:
   - Go to the frontend application
   - Click "Sign in with Google"
   - Use the admin email address
   - Verify admin features are accessible

### Script Options

The bootstrap script accepts the following environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `USERS_TABLE_NAME` | `LocationDetection-Users-development` | DynamoDB Users table name |
| `AWS_REGION` | `us-east-1` | AWS region |

### Error Handling

**User already exists**:
```
⚠️  User already exists with email: admin@yourcompany.com
   Current role: user
   Status: active

❌ User exists but is not an admin. Please manually update the role in DynamoDB.
```

**Solution**: Update the user's role in DynamoDB Console:
1. Go to DynamoDB > Tables > LocationDetection-Users-development
2. Find the user by email
3. Edit item > Change `role` to `admin`
4. Save changes

## Managing User Invites

Admins can generate invite codes for new users.

### Creating an Invite

**API Endpoint**: `POST /admin/invites`

**Headers**:
```
Authorization: Bearer <FIREBASE_ID_TOKEN>
Content-Type: application/json
```

**Request Body**:
```json
{
  "email": "newuser@example.com",
  "role": "user"
}
```

**Response**:
```json
{
  "inviteCode": "INV-550e8400-e29b",
  "email": "newuser@example.com",
  "role": "user",
  "status": "pending",
  "expiresAt": "2025-01-15T12:00:00.000Z",
  "createdAt": "2025-01-08T12:00:00.000Z"
}
```

### Using cURL

```bash
# Get your Firebase ID token (from browser console)
ID_TOKEN=$(firebase.auth().currentUser.getIdToken())

# Create invite
curl -X POST https://your-api.amazonaws.com/admin/invites \
  -H "Authorization: Bearer $ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "role": "user"
  }'
```

### Sending Invites to Users

1. **Copy the invite code** from API response
2. **Send to user via email** (manual process or integrate with SES):

```
Subject: You're invited to Location Detection AI

Hi,

You've been invited to use Location Detection AI.

Your invite code: INV-550e8400-e29b

To get started:
1. Go to https://your-app.com
2. Sign in with Google using: newuser@example.com
3. Enter your invite code when prompted
4. Start uploading blueprints!

This invite expires on January 15, 2025.

Best regards,
Location Detection AI Team
```

### Listing Invites

**API Endpoint**: `GET /admin/invites`

**Response**:
```json
{
  "invites": [
    {
      "inviteCode": "INV-550e8400-e29b",
      "email": "newuser@example.com",
      "role": "user",
      "status": "pending",
      "expiresAt": "2025-01-15T12:00:00.000Z",
      "createdAt": "2025-01-08T12:00:00.000Z"
    },
    {
      "inviteCode": "INV-660e8400-e29c",
      "email": "accepted@example.com",
      "role": "user",
      "status": "accepted",
      "acceptedAt": "2025-01-09T10:30:00.000Z",
      "expiresAt": "2025-01-15T12:00:00.000Z",
      "createdAt": "2025-01-08T12:00:00.000Z"
    }
  ]
}
```

### Revoking Invites

**API Endpoint**: `DELETE /admin/invites/{inviteCode}`

```bash
curl -X DELETE https://your-api.amazonaws.com/admin/invites/INV-550e8400-e29b \
  -H "Authorization: Bearer $ID_TOKEN"
```

## User Management

### Listing Users

**API Endpoint**: `GET /admin/users`

**Response**:
```json
{
  "users": [
    {
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "email": "admin@yourcompany.com",
      "role": "admin",
      "status": "active",
      "createdAt": "2025-01-08T12:00:00.000Z"
    },
    {
      "userId": "660e8400-e29c-41d4-a716-446655440001",
      "email": "user@example.com",
      "role": "user",
      "status": "active",
      "uploadCount": 25,
      "lastUpload": "2025-01-08T11:30:00.000Z",
      "createdAt": "2025-01-07T10:00:00.000Z"
    }
  ]
}
```

### Viewing User Details

**API Endpoint**: `GET /admin/users/{userId}`

**Response**:
```json
{
  "userId": "660e8400-e29c-41d4-a716-446655440001",
  "email": "user@example.com",
  "role": "user",
  "status": "active",
  "uploadCount": 25,
  "uploadLimit": 50,
  "uploadsToday": 3,
  "lastUpload": "2025-01-08T11:30:00.000Z",
  "createdAt": "2025-01-07T10:00:00.000Z",
  "jobs": [
    {
      "jobId": "job-123",
      "status": "completed",
      "createdAt": "2025-01-08T11:30:00.000Z"
    }
  ]
}
```

### Suspending a User

**API Endpoint**: `PATCH /admin/users/{userId}`

**Request**:
```json
{
  "status": "suspended"
}
```

**Response**:
```json
{
  "userId": "660e8400-e29c-41d4-a716-446655440001",
  "email": "user@example.com",
  "role": "user",
  "status": "suspended",
  "updatedAt": "2025-01-08T12:00:00.000Z"
}
```

### Reactivating a User

**Request**:
```json
{
  "status": "active"
}
```

### Updating User Role

**Request**:
```json
{
  "role": "admin"
}
```

**Note**: Use with caution. Admins have unlimited uploads and access to admin endpoints.

## Access Control

### User Roles

| Role | Upload Limit | Admin Access | API Access |
|------|--------------|--------------|------------|
| `admin` | Unlimited | ✅ Yes | All endpoints |
| `user` | 50/day | ❌ No | Upload, status, results |

### Permission Matrix

| Endpoint | Admin | User | Anonymous |
|----------|-------|------|-----------|
| `POST /upload` | ✅ | ✅ | ❌ |
| `GET /status/{jobId}` | ✅ | ✅ (own jobs) | ❌ |
| `GET /results/{jobId}` | ✅ | ✅ (own jobs) | ❌ |
| `GET /users/me` | ✅ | ✅ | ❌ |
| `POST /admin/invites` | ✅ | ❌ | ❌ |
| `GET /admin/invites` | ✅ | ❌ | ❌ |
| `GET /admin/users` | ✅ | ❌ | ❌ |
| `PATCH /admin/users/{userId}` | ✅ | ❌ | ❌ |

## Monitoring and Analytics

### Rate Limit Monitoring

**Query DynamoDB** to see upload patterns:

```bash
aws dynamodb scan \
  --table-name LocationDetection-RateLimits-development \
  --filter-expression "uploadCount > :threshold" \
  --expression-attribute-values '{":threshold": {"N": "40"}}' \
  --region us-east-1
```

### User Activity

**CloudWatch Logs Insights** query:

```
fields @timestamp, userId, action, statusCode
| filter action = "upload" or action = "status"
| stats count() by userId, action
| sort count desc
```

### Failed Authentications

```
fields @timestamp, error, headers.authorization
| filter error like /authentication/
| stats count() by bin(5m)
```

## Troubleshooting

### User Can't Sign In

**Symptoms**: Error during Google Sign-In

**Checks**:
1. Is email in DynamoDB Users table?
2. Is user status `active`?
3. Is Firebase project configured correctly?
4. Is email verified in Firebase?

**Solution**:
```bash
# Check DynamoDB
aws dynamodb get-item \
  --table-name LocationDetection-Users-development \
  --key '{"email": {"S": "user@example.com"}}' \
  --region us-east-1
```

### User Exceeds Rate Limit

**Symptoms**: `429 Too Many Requests` error

**Checks**:
1. How many uploads today?
2. Is user role `admin` or `user`?

**Solution**:
```bash
# Check rate limit record
aws dynamodb get-item \
  --table-name LocationDetection-RateLimits-development \
  --key '{"userId": {"S": "660e8400-e29c#2025-01-08"}}' \
  --region us-east-1

# Option 1: Reset counter (not recommended)
aws dynamodb delete-item \
  --table-name LocationDetection-RateLimits-development \
  --key '{"userId": {"S": "660e8400-e29c#2025-01-08"}}' \
  --region us-east-1

# Option 2: Upgrade to admin (if appropriate)
# See "Updating User Role" above
```

### Invite Not Working

**Symptoms**: User enters invite code but gets error

**Checks**:
1. Is invite status `pending`?
2. Has invite expired?
3. Does email match?

**Solution**:
```bash
# Check invite
aws dynamodb get-item \
  --table-name LocationDetection-Invites-development \
  --key '{"inviteCode": {"S": "INV-550e8400-e29b"}}' \
  --region us-east-1

# Create new invite if expired
curl -X POST https://your-api.amazonaws.com/admin/invites \
  -H "Authorization: Bearer $ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "role": "user"}'
```

## Best Practices

### ✅ DO:
- Review new user requests regularly
- Monitor rate limit violations
- Audit admin actions via CloudWatch
- Keep invite codes private
- Set expiration dates on invites
- Document user access changes
- Backup DynamoDB tables regularly

### ❌ DON'T:
- Share invite codes publicly
- Grant admin access unnecessarily
- Disable rate limiting in production
- Ignore suspended user complaints without investigation
- Delete users (suspend instead)
- Reuse invite codes

## Additional Resources

- [Firebase Setup Guide](./FIREBASE_SETUP.md)
- [API Documentation](./API.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
- [Deployment Guide](./DEPLOYMENT.md)
