# 🔥 Firestore Setup Guide

## 1️⃣ Enable Firestore in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click **"Firestore Database"** in the left sidebar
4. Click **"Create database"**
5. Choose **"Start in production mode"** (we'll add rules next)
6. Select your preferred region (choose closest to your users)
7. Click **"Enable"**

## 2️⃣ Deploy Firestore Security Rules

### Option A: Via Firebase Console (Quick)

1. In Firebase Console, go to **Firestore Database**
2. Click the **"Rules"** tab
3. Copy the contents of `/firestore.rules` from this project
4. Paste into the editor
5. Click **"Publish"**

### Option B: Via Firebase CLI (Recommended)

```bash
# Install Firebase CLI if you haven't
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project (if not already done)
firebase init firestore

# This creates firebase.json and firestore.rules

# Deploy rules
firebase deploy --only firestore:rules
```

## 3️⃣ Understanding the Security Rules

Our Firestore security rules enforce the following:

### **Users Collection** (`/users/{userId}`)

✅ **Read:**
- Users can read their own profile
- Admins can read all profiles

✅ **Create:**
- Users can create their own profile during role selection
- Must set `role` to either `'student'` or `'admin'`
- Can only create once (no duplicate profiles)

❌ **Update:**
- Disabled (roles are immutable)
- Could enable for admins if needed

❌ **Delete:**
- Disabled (users cannot be deleted)

### **Jobs Collection** (`/jobs/{jobId}`)

✅ **Read:**
- Users can read their own jobs
- Admins can read all jobs

✅ **Create:**
- Users can create jobs with their own `userId`
- Must match authenticated user

✅ **Update:**
- Users can update their own jobs
- Useful for status changes

✅ **Delete:**
- Only admins can delete jobs

## 4️⃣ Testing Security Rules

### In Firebase Console

1. Go to **Firestore Database** → **Rules** tab
2. Click **"Rules Playground"**
3. Test different scenarios:

**Test 1: User reads own profile**
```
Location: /users/test-user-id
Authenticated: Yes (test-user-id)
Operation: get
Expected: ✅ Allowed
```

**Test 2: User reads other user's profile**
```
Location: /users/other-user-id
Authenticated: Yes (test-user-id)
Operation: get
Expected: ❌ Denied
```

**Test 3: Admin reads all users**
```
Location: /users/any-user-id
Authenticated: Yes (admin-user-id with role: 'admin')
Operation: get
Expected: ✅ Allowed
```

### In Your App

Run these tests in your browser console:

```javascript
// Test 1: Create user profile (should work)
const { createUserProfile } = await import('./src/services/firestore');
await createUserProfile(auth.currentUser.uid, 'test@example.com', 'Test User', null, 'student');

// Test 2: Get own profile (should work)
const { getUserProfile } = await import('./src/services/firestore');
const profile = await getUserProfile(auth.currentUser.uid);
console.log('Profile:', profile);

// Test 3: Get all users (should work only if admin)
const { getAllUsers } = await import('./src/services/firestore');
const users = await getAllUsers();
console.log('All users:', users);
```

## 5️⃣ Firestore Indexes

For better query performance, create these indexes:

### Via Firebase Console

1. Go to **Firestore Database** → **Indexes** tab
2. Create composite indexes:

**Index 1: Jobs by userId**
- Collection: `jobs`
- Fields: `userId` (Ascending), `uploadedAt` (Descending)

**Index 2: Users by role**
- Collection: `users`
- Fields: `role` (Ascending), `createdAt` (Descending)

### Via Firebase CLI

Create `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "jobs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "uploadedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "role", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

Then deploy:
```bash
firebase deploy --only firestore:indexes
```

## 6️⃣ Data Structure

### Users Document (`/users/{userId}`)

```typescript
{
  uid: string,              // Same as document ID (Firebase Auth UID)
  email: string,            // User's email from Google
  displayName: string,      // User's name from Google
  photoURL: string | null,  // Profile photo URL from Google
  role: 'student' | 'admin', // User's selected role
  createdAt: Timestamp      // When user registered
}
```

### Jobs Document (`/jobs/{jobId}`)

```typescript
{
  jobId: string,            // Same as document ID (UUID)
  userId: string,           // Who uploaded this job
  fileName: string,         // Original file name
  status: 'pending' | 'processing' | 'completed' | 'failed',
  uploadedAt: Timestamp,    // When uploaded
  resultUrl?: string        // S3 URL to results (optional, when ready)
}
```

## 7️⃣ Monitoring and Debugging

### View Data in Console

1. Go to **Firestore Database** → **Data** tab
2. Browse collections: `users`, `jobs`
3. View/edit documents manually if needed

### Enable Firestore Logs

In your app, enable debug mode:

```javascript
import { enableIndexedDbPersistence } from 'firebase/firestore';

// Enable offline persistence and logging
enableIndexedDbPersistence(db)
  .catch((err) => {
    console.error('Persistence error:', err);
  });
```

### Check Security Rule Errors

In Firebase Console:
1. Go to **Firestore Database** → **Usage** tab
2. Look for permission denied errors
3. Check which rules are being triggered

## 8️⃣ Cost Optimization

Firestore pricing is based on:
- Document reads/writes
- Storage
- Network egress

### Free Tier Limits (Spark Plan)
- 50,000 reads/day
- 20,000 writes/day
- 1 GB storage

### Optimization Tips
1. **Cache user profiles** - Don't refetch on every page load
2. **Use pagination** - Don't load all jobs at once
3. **Limit admin queries** - Only fetch when viewing dashboard
4. **Use listeners sparingly** - Prefer one-time reads

### Enable Billing Alerts

1. Go to Firebase Console → **Usage and billing**
2. Set up budget alerts
3. Monitor daily usage

## 9️⃣ Backup and Export

### Enable Point-in-Time Recovery

1. Go to Firebase Console → **Firestore Database**
2. Click **Settings** (gear icon)
3. Enable **Point-in-time recovery** (PITR)
4. This allows restore from last 7 days

### Export Data (Manual Backup)

```bash
# Install gcloud CLI
# Then export Firestore data
gcloud firestore export gs://your-backup-bucket
```

## 🔟 Production Checklist

Before going live:

- [ ] Security rules deployed and tested
- [ ] Indexes created for all queries
- [ ] Billing alerts configured
- [ ] Point-in-time recovery enabled
- [ ] Data structure documented
- [ ] Backup strategy in place
- [ ] Monitoring dashboard set up
- [ ] Test with real user scenarios
- [ ] Verify admin vs student permissions
- [ ] Test role selection flow

## 🆘 Troubleshooting

### "Missing or insufficient permissions"

**Cause:** Security rules denying access
**Fix:** Check rules in Firebase Console, ensure user is authenticated

### "PERMISSION_DENIED: Missing or insufficient permissions"

**Cause:** User trying to access data they don't own
**Fix:** Verify user is logged in and accessing their own data

### "Index not found"

**Cause:** Query requires an index that doesn't exist
**Fix:** Firebase will show a link to create the index automatically

### Slow queries

**Cause:** Missing indexes or too much data
**Fix:** Create appropriate indexes, implement pagination

---

## 📚 Additional Resources

- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Security Rules Guide](https://firebase.google.com/docs/firestore/security/get-started)
- [Data Modeling Best Practices](https://firebase.google.com/docs/firestore/manage-data/structure-data)
- [Performance Tips](https://firebase.google.com/docs/firestore/best-practices)

---

**Your Firestore database is ready!** Users can now select roles and admins can view all jobs and users. 🎉
