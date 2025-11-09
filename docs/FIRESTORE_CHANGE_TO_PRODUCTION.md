# 🔒 Change Firestore from Test Mode to Production Mode

## Quick Fix (5 minutes)

### Option 1: Via Firebase Console (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `location-detection-ai`
3. Click **Firestore Database** in the left sidebar
4. Click the **Rules** tab at the top
5. You'll see something like this (TEST MODE):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if
          request.time < timestamp.date(2025, 12, 8); // Expires in 30 days
    }
  }
}
```

6. **Replace EVERYTHING** with the production rules from `/firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }

    // Helper function to check if user is admin
    function isAdmin() {
      return isAuthenticated() &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Helper function to check if user owns the resource
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // Users collection
    match /users/{userId} {
      // Anyone authenticated can read their own profile
      allow read: if isAuthenticated() && isOwner(userId);

      // Admins can read all user profiles
      allow read: if isAdmin();

      // Users can create their own profile (only once, during role selection)
      allow create: if isAuthenticated() &&
                      isOwner(userId) &&
                      request.resource.data.uid == userId &&
                      request.resource.data.role in ['student', 'admin'];

      // Users cannot update their own profile (role is immutable)
      // Admins could update if needed, but currently disabled for security
      allow update: if false;

      // No one can delete user profiles
      allow delete: if false;
    }

    // Jobs collection
    match /jobs/{jobId} {
      // Users can read their own jobs
      allow read: if isAuthenticated() && isOwner(resource.data.userId);

      // Admins can read all jobs
      allow read: if isAdmin();

      // Users can create jobs with their own userId
      allow create: if isAuthenticated() &&
                      request.resource.data.userId == request.auth.uid &&
                      request.resource.data.jobId == jobId;

      // Users can update their own jobs (for status changes)
      allow update: if isAuthenticated() && isOwner(resource.data.userId);

      // Only admins can delete jobs
      allow delete: if isAdmin();
    }
  }
}
```

7. Click **Publish** button
8. ✅ Done! Your Firestore is now in production mode with proper security

---

### Option 2: Via Firebase CLI

If you have Firebase CLI installed:

```bash
# Navigate to your project root
cd /Users/tyler/Desktop/Gauntlet/location-detection-ai

# Login to Firebase
firebase login

# Initialize Firestore (if not already done)
firebase init firestore

# The firestore.rules file is already in your project root
# Just deploy it:
firebase deploy --only firestore:rules
```

---

## 🧪 Test the Rules

After deploying, test that security is working:

### Test 1: Unauthenticated Access (Should Fail)
Open browser console and try:
```javascript
// This should fail with permission denied
const db = getFirestore();
const users = await getDocs(collection(db, 'users'));
```

### Test 2: Read Own Profile (Should Work)
```javascript
// Sign in first, then this should work
const db = getFirestore();
const auth = getAuth();
const myProfile = await getDoc(doc(db, 'users', auth.currentUser.uid));
console.log(myProfile.data()); // Should show your profile
```

### Test 3: Read Other User's Profile (Should Fail for Students)
```javascript
// This should fail unless you're an admin
const db = getFirestore();
const otherProfile = await getDoc(doc(db, 'users', 'some-other-user-id'));
// Permission denied
```

### Test 4: Admin Can Read All (Should Work for Admins)
```javascript
// If you're an admin, this should work
const db = getFirestore();
const users = await getDocs(collection(db, 'users'));
console.log(users.docs.length); // Shows all users
```

---

## 🔍 Verify Rules Are Active

1. Go to Firebase Console → Firestore Database → Rules tab
2. Check the rules don't have an expiration date anymore
3. You should see the full rule set with `isAuthenticated()`, `isAdmin()`, etc.

---

## ⚠️ What Changed

### Before (Test Mode)
```javascript
allow read, write: if request.time < timestamp.date(2025, 12, 8);
```
- **Problem**: Anyone can read/write until the expiration date
- **Security**: None (wide open!)

### After (Production Mode)
```javascript
allow read: if isAuthenticated() && isOwner(userId);
allow read: if isAdmin();
```
- **Security**: Only authenticated users can access their own data
- **Admin Access**: Admins can see everything
- **Protection**: Data is protected by role-based access control

---

## 🎯 Security Rules Summary

After changing to production mode, your Firestore enforces:

### Users Collection
✅ Users can only read their own profile
✅ Admins can read all profiles
✅ Users can create their profile once (during role selection)
❌ Users cannot change their role
❌ Users cannot delete profiles

### Jobs Collection
✅ Users can only read their own jobs
✅ Admins can read all jobs
✅ Users can create jobs
✅ Users can update their own jobs
❌ Only admins can delete jobs

---

## 🆘 Troubleshooting

### "Permission denied" errors after updating rules
- Sign out and sign in again
- Clear browser cache
- Make sure you're using the correct user account

### Rules don't seem to apply
- Wait 1-2 minutes for rules to propagate
- Refresh the Firebase Console
- Check the Rules tab shows the new rules

### Can't access admin dashboard
- Verify your user document in Firestore has `role: 'admin'`
- Check you're signed in with the correct account
- Try signing out and back in

---

## ✅ Checklist

- [ ] Open Firebase Console → Firestore Database → Rules tab
- [ ] Replace test mode rules with production rules from `/firestore.rules`
- [ ] Click "Publish"
- [ ] Test authentication by signing in to your app
- [ ] Test that you can access your own data
- [ ] Test that you cannot access other users' data (unless admin)
- [ ] Verify admin dashboard works (if you're admin)

---

**You're all set!** Your Firestore is now in production mode with proper security. 🔒
