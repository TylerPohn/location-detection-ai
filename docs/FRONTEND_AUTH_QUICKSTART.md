# Frontend Authentication Quick Start Guide

## Overview

This application uses **frontend-only Firebase Authentication** for simple, secure user authentication. No backend integration is required to get started.

## What's Protected

- **Upload Page**: Requires login to upload floor plans
- **Results Page**: Requires login to view detection results
- **Job Status**: Requires login to check processing status

## What's Public

- **Home Page**: Accessible to everyone
- **Marketing/Info Pages**: No authentication required

## Setup Instructions

### 1. Firebase Project Setup (Already Completed)

You should already have:
- A Firebase project created at https://console.firebase.google.com
- Email/Password authentication enabled
- Web app registered in Firebase

### 2. Get Your Firebase Configuration

1. Go to Firebase Console → Project Settings → General
2. Scroll to "Your apps" section
3. Click on your web app (or create one if needed)
4. Copy the Firebase configuration object

You need these values:
```javascript
{
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:..."
}
```

### 3. Configure Environment Variables

Create `/frontend/.env.local` file:

```env
# Firebase Authentication Configuration
VITE_FIREBASE_API_KEY=AIzaSy...your-actual-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890abcdef

# API Configuration (for job processing)
VITE_API_GATEWAY_URL=https://your-api-gateway.amazonaws.com
VITE_AWS_REGION=us-east-1
```

**Finding Your Values:**
- **API Key**: Firebase Console → Project Settings → General → Web API Key
- **Auth Domain**: Usually `[project-id].firebaseapp.com`
- **Project ID**: Firebase Console → Project Settings → General
- **Storage Bucket**: Usually `[project-id].appspot.com`
- **Messaging Sender ID**: Firebase Console → Project Settings → Cloud Messaging
- **App ID**: Firebase Console → Project Settings → Your Apps → App ID

### 4. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at http://localhost:5173

### 5. Test Authentication

1. Navigate to http://localhost:5173
2. Click "Sign In" or "Get Started"
3. Choose "Sign up" if you don't have an account
4. Enter email and password
5. You'll be redirected to the Upload page

## User Flow

```
┌─────────────┐
│  Home Page  │ (Public)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Sign In    │ (Firebase Auth)
│  Sign Up    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Upload Page │ (Protected)
└──────┬──────┘
       │ Upload floor plan
       ▼
┌─────────────┐
│Results Page │ (Protected)
│ View rooms  │
│ See details │
└─────────────┘
```

## Authentication Features

### Currently Implemented ✅

- Email/password registration
- Email/password login
- Protected routes (automatic redirect to login)
- User session persistence
- Logout functionality
- Loading states during auth operations
- Error handling for auth failures

### Not Implemented ❌

- Password reset (can be added easily with Firebase)
- Email verification (can be added easily with Firebase)
- Social auth (Google, GitHub, etc.) - optional
- User roles/permissions (frontend-only has basic auth)
- Backend integration (job ownership, admin features)
- Rate limiting (would require backend)
- User profiles (can be added if needed)

## Security Notes

### What This Provides

- Secure authentication via Firebase
- JWT tokens for API calls (if needed)
- Protected routes in the UI
- Session management

### What This Doesn't Provide

- Server-side authorization (no backend integration yet)
- Job ownership verification (jobs are public to authenticated users)
- Rate limiting (anyone authenticated can upload unlimited files)
- Admin controls (no role-based access)

## Troubleshooting

### "Firebase configuration not found"

Make sure `.env.local` exists in `/frontend` directory with all required variables.

### "Invalid API key"

1. Check that you copied the full API key from Firebase Console
2. Make sure there are no extra spaces in `.env.local`
3. Restart the dev server after changing `.env.local`

### "Auth domain not authorized"

1. Go to Firebase Console → Authentication → Settings → Authorized Domains
2. Add `localhost` to the authorized domains
3. For production, add your deployment domain

### "User creation failed"

1. Check Firebase Console → Authentication → Sign-in method
2. Make sure "Email/Password" is enabled
3. Check browser console for specific error messages

## Next Steps

Once authentication is working, you can:

1. **Add Password Reset**: See Firebase documentation for password reset flows
2. **Add Email Verification**: Enhance security by verifying user emails
3. **Add Social Auth**: Enable Google, GitHub, or other providers
4. **Backend Integration**: See `docs/BACKEND_AUTH_INTEGRATION.md` for adding server-side features

## API Integration

When making API calls to your backend, the Firebase auth token is automatically included:

```typescript
// AuthContext handles this automatically
const { user } = useAuth();

// When user is logged in, API calls include the token
fetch('/api/upload', {
  headers: {
    'Authorization': `Bearer ${await user.getIdToken()}`
  }
});
```

Your backend can verify these tokens if you implement backend integration later.

## Files Created

This simple auth setup consists of:

- `/frontend/src/config/firebase.ts` - Firebase initialization
- `/frontend/src/context/AuthContext.tsx` - Auth state management
- `/frontend/src/components/Auth/` - Login/Signup components
- `/frontend/src/routes/ProtectedRoute.tsx` - Route protection

All files are frontend-only, no backend changes required.
