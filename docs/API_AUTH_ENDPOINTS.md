# Authentication & Admin API Endpoints

This document describes authentication and admin-only endpoints for the Location Detection AI application.

## User Endpoints

### Get Current User Info

Get information about the authenticated user.

**Endpoint**: `GET /users/me`

**Authentication**: Required

**Headers**:
```
Authorization: Bearer <FIREBASE_ID_TOKEN>
```

**Success Response** (200 OK):
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "role": "user",
  "status": "active",
  "uploadLimit": 50,
  "uploadsToday": 12,
  "uploadsRemaining": 38,
  "limitResetTime": "2025-11-08T00:00:00Z",
  "createdAt": "2025-11-07T10:00:00Z"
}
```

**Example**:
```bash
curl -X GET https://api.location-detection.example.com/users/me \
  -H "Authorization: Bearer $ID_TOKEN"
```

---

## Admin Endpoints

All admin endpoints require `role: "admin"` in the user record.

### Create Invite

Generate an invite code for a new user.

**Endpoint**: `POST /admin/invites`

**Authentication**: Required (Admin only)

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

**Validation**:
- `email`: Required, valid email format
- `role`: Optional, default: "user", allowed: ["user", "admin"]

**Success Response** (201 Created):
```json
{
  "inviteCode": "INV-550e8400-e29b",
  "email": "newuser@example.com",
  "role": "user",
  "status": "pending",
  "expiresAt": "2025-11-15T12:00:00Z",
  "createdAt": "2025-11-08T12:00:00Z",
  "createdBy": "admin@example.com"
}
```

**Error Response** (403 Forbidden):
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Admin access required"
  }
}
```

**Example**:
```bash
curl -X POST https://api.location-detection.example.com/admin/invites \
  -H "Authorization: Bearer $ADMIN_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "role": "user"
  }'
```

---

### List Invites

Get all invite codes (pending and accepted).

**Endpoint**: `GET /admin/invites`

**Authentication**: Required (Admin only)

**Query Parameters**:
- `status`: Filter by status (`pending` | `accepted` | `expired` | `all`) - default: `all`
- `limit`: Items per page (default: 50, max: 100)
- `page`: Page number (default: 1)

**Success Response** (200 OK):
```json
{
  "invites": [
    {
      "inviteCode": "INV-550e8400-e29b",
      "email": "newuser@example.com",
      "role": "user",
      "status": "pending",
      "expiresAt": "2025-11-15T12:00:00Z",
      "createdAt": "2025-11-08T12:00:00Z",
      "createdBy": "admin@example.com"
    },
    {
      "inviteCode": "INV-660e8400-e29c",
      "email": "accepted@example.com",
      "role": "user",
      "status": "accepted",
      "acceptedAt": "2025-11-09T10:30:00Z",
      "acceptedBy": "660e8400-e29c-41d4-a716-446655440001",
      "expiresAt": "2025-11-15T12:00:00Z",
      "createdAt": "2025-11-08T12:00:00Z",
      "createdBy": "admin@example.com"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 2,
    "totalPages": 1
  }
}
```

**Example**:
```bash
curl -X GET "https://api.location-detection.example.com/admin/invites?status=pending" \
  -H "Authorization: Bearer $ADMIN_ID_TOKEN"
```

---

### Get Invite Details

Get details of a specific invite.

**Endpoint**: `GET /admin/invites/{inviteCode}`

**Authentication**: Required (Admin only)

**Path Parameters**:
- `inviteCode`: Invite code (e.g., `INV-550e8400-e29b`)

**Success Response** (200 OK):
```json
{
  "inviteCode": "INV-550e8400-e29b",
  "email": "newuser@example.com",
  "role": "user",
  "status": "pending",
  "expiresAt": "2025-11-15T12:00:00Z",
  "createdAt": "2025-11-08T12:00:00Z",
  "createdBy": "admin@example.com"
}
```

**Error Response** (404 Not Found):
```json
{
  "error": {
    "code": "INVITE_NOT_FOUND",
    "message": "Invite code not found"
  }
}
```

---

### Revoke Invite

Revoke a pending invite code.

**Endpoint**: `DELETE /admin/invites/{inviteCode}`

**Authentication**: Required (Admin only)

**Path Parameters**:
- `inviteCode`: Invite code to revoke

**Success Response** (204 No Content):
```
(Empty response body)
```

**Error Response** (404 Not Found):
```json
{
  "error": {
    "code": "INVITE_NOT_FOUND",
    "message": "Invite code not found"
  }
}
```

**Example**:
```bash
curl -X DELETE https://api.location-detection.example.com/admin/invites/INV-550e8400-e29b \
  -H "Authorization: Bearer $ADMIN_ID_TOKEN"
```

---

### List Users

Get all users in the system.

**Endpoint**: `GET /admin/users`

**Authentication**: Required (Admin only)

**Query Parameters**:
- `role`: Filter by role (`user` | `admin` | `all`) - default: `all`
- `status`: Filter by status (`active` | `suspended` | `all`) - default: `all`
- `limit`: Items per page (default: 50, max: 100)
- `page`: Page number (default: 1)
- `sortBy`: Sort field (`createdAt` | `lastUpload` | `uploadCount`) - default: `createdAt`
- `order`: Sort order (`asc` | `desc`) - default: `desc`

**Success Response** (200 OK):
```json
{
  "users": [
    {
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "email": "admin@example.com",
      "role": "admin",
      "status": "active",
      "createdAt": "2025-11-01T10:00:00Z",
      "totalUploads": 150,
      "lastUpload": "2025-11-08T11:30:00Z"
    },
    {
      "userId": "660e8400-e29c-41d4-a716-446655440001",
      "email": "user@example.com",
      "role": "user",
      "status": "active",
      "uploadLimit": 50,
      "uploadsToday": 12,
      "createdAt": "2025-11-07T10:00:00Z",
      "totalUploads": 25,
      "lastUpload": "2025-11-08T11:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 2,
    "totalPages": 1
  }
}
```

**Example**:
```bash
curl -X GET "https://api.location-detection.example.com/admin/users?status=active&role=user" \
  -H "Authorization: Bearer $ADMIN_ID_TOKEN"
```

---

### Get User Details

Get detailed information about a specific user.

**Endpoint**: `GET /admin/users/{userId}`

**Authentication**: Required (Admin only)

**Path Parameters**:
- `userId`: User ID (UUID)

**Success Response** (200 OK):
```json
{
  "userId": "660e8400-e29c-41d4-a716-446655440001",
  "email": "user@example.com",
  "role": "user",
  "status": "active",
  "uploadLimit": 50,
  "uploadsToday": 12,
  "totalUploads": 25,
  "lastUpload": "2025-11-08T11:00:00Z",
  "createdAt": "2025-11-07T10:00:00Z",
  "updatedAt": "2025-11-08T12:00:00Z",
  "recentJobs": [
    {
      "jobId": "job-123",
      "status": "completed",
      "roomCount": 5,
      "createdAt": "2025-11-08T11:00:00Z"
    },
    {
      "jobId": "job-124",
      "status": "processing",
      "createdAt": "2025-11-08T11:30:00Z"
    }
  ]
}
```

**Error Response** (404 Not Found):
```json
{
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User not found"
  }
}
```

---

### Update User

Update user properties (role, status).

**Endpoint**: `PATCH /admin/users/{userId}`

**Authentication**: Required (Admin only)

**Path Parameters**:
- `userId`: User ID to update

**Request Body**:
```json
{
  "role": "admin",
  "status": "active"
}
```

**Allowed Updates**:
- `role`: "user" | "admin"
- `status`: "active" | "suspended"

**Success Response** (200 OK):
```json
{
  "userId": "660e8400-e29c-41d4-a716-446655440001",
  "email": "user@example.com",
  "role": "admin",
  "status": "active",
  "updatedAt": "2025-11-08T12:00:00Z"
}
```

**Example - Suspend User**:
```bash
curl -X PATCH https://api.location-detection.example.com/admin/users/660e8400-e29c \
  -H "Authorization: Bearer $ADMIN_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "suspended"
  }'
```

**Example - Grant Admin**:
```bash
curl -X PATCH https://api.location-detection.example.com/admin/users/660e8400-e29c \
  -H "Authorization: Bearer $ADMIN_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "admin"
  }'
```

---

### Get System Stats

Get system-wide statistics (admin dashboard).

**Endpoint**: `GET /admin/stats`

**Authentication**: Required (Admin only)

**Success Response** (200 OK):
```json
{
  "users": {
    "total": 45,
    "active": 42,
    "suspended": 3,
    "admins": 2
  },
  "uploads": {
    "today": 127,
    "thisWeek": 845,
    "thisMonth": 3420,
    "total": 15678
  },
  "jobs": {
    "pending": 3,
    "processing": 8,
    "completed": 15650,
    "failed": 25
  },
  "invites": {
    "pending": 5,
    "accepted": 40,
    "expired": 12
  },
  "storage": {
    "blueprints": "12.5 GB",
    "results": "8.2 GB",
    "total": "20.7 GB"
  }
}
```

**Example**:
```bash
curl -X GET https://api.location-detection.example.com/admin/stats \
  -H "Authorization: Bearer $ADMIN_ID_TOKEN"
```

---

## Permission Matrix

| Endpoint | Admin | User | Anonymous |
|----------|-------|------|-----------|
| `GET /users/me` | ✅ | ✅ | ❌ |
| `POST /admin/invites` | ✅ | ❌ | ❌ |
| `GET /admin/invites` | ✅ | ❌ | ❌ |
| `GET /admin/invites/{code}` | ✅ | ❌ | ❌ |
| `DELETE /admin/invites/{code}` | ✅ | ❌ | ❌ |
| `GET /admin/users` | ✅ | ❌ | ❌ |
| `GET /admin/users/{id}` | ✅ | ❌ | ❌ |
| `PATCH /admin/users/{id}` | ✅ | ❌ | ❌ |
| `GET /admin/stats` | ✅ | ❌ | ❌ |

---

## Examples

### Complete Admin Workflow

```bash
#!/bin/bash

# Set admin token
ADMIN_TOKEN="eyJhbGciOiJSUzI1NiIs..."

API_URL="https://api.location-detection.example.com"

# 1. Create invite for new user
INVITE_RESPONSE=$(curl -s -X POST "${API_URL}/admin/invites" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "newuser@example.com", "role": "user"}')

INVITE_CODE=$(echo $INVITE_RESPONSE | jq -r '.inviteCode')
echo "Invite created: $INVITE_CODE"

# 2. List all pending invites
curl -s -X GET "${API_URL}/admin/invites?status=pending" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '.invites'

# 3. List all users
curl -s -X GET "${API_URL}/admin/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '.users'

# 4. Get system stats
curl -s -X GET "${API_URL}/admin/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq

# 5. Suspend a user
curl -s -X PATCH "${API_URL}/admin/users/660e8400-e29c" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "suspended"}' \
  | jq
```

---

## See Also

- [Main API Documentation](./API.md)
- [Admin Guide](./ADMIN_GUIDE.md)
- [Firebase Setup Guide](./FIREBASE_SETUP.md)
