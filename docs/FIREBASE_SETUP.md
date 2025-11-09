# Firebase Setup Guide

This guide walks you through setting up Firebase Authentication for the Location Detection AI application.

## Prerequisites

- Google account
- Access to [Firebase Console](https://console.firebase.google.com/)
- AWS CLI configured
- Application deployed to AWS

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add Project**
3. Enter project name: `location-detection-ai` (or your preferred name)
4. Enable Google Analytics (optional)
5. Click **Create Project**

## Step 2: Enable Google Sign-In

1. In Firebase Console, navigate to **Authentication** > **Sign-in method**
2. Click **Google** provider
3. Toggle **Enable**
4. Set project support email (your email)
5. Click **Save**

## Step 3: Configure Authorized Domains

1. In **Authentication** > **Settings** > **Authorized domains**
2. Add your frontend domain(s):
   - `localhost` (for local development)
   - `your-frontend-domain.com` (production domain)
   - `your-cloudfront-distribution.cloudfront.net` (if using CloudFront)

## Step 4: Get Firebase Configuration

### For Frontend (Web App)

1. Go to **Project Settings** (gear icon) > **General**
2. Scroll to **Your apps** section
3. Click **Web** icon (`</>`)
4. Register app with nickname: `location-detection-frontend`
5. Copy the Firebase config object:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

6. Add these to `frontend/.env`:

```bash
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

## Step 5: Generate Service Account Key (Backend)

1. Go to **Project Settings** > **Service accounts**
2. Click **Generate new private key**
3. Confirm by clicking **Generate key**
4. Save the JSON file securely (DO NOT commit to Git)

### Store in AWS Secrets Manager

```bash
# Create secret for service account key
aws secretsmanager create-secret \
  --name location-detection/firebase-service-account \
  --description "Firebase Admin SDK service account key" \
  --secret-string file://path/to/service-account-key.json \
  --region us-east-1

# Get the secret ARN (save this)
aws secretsmanager describe-secret \
  --secret-id location-detection/firebase-service-account \
  --region us-east-1 \
  --query ARN \
  --output text
```

### Update Lambda Environment Variables

Add to your CDK stack or update manually:

```typescript
// In infrastructure/lib/lambda-stack.ts
environment: {
  FIREBASE_PROJECT_ID: 'your-project-id',
  FIREBASE_SERVICE_ACCOUNT_SECRET_ARN: 'arn:aws:secretsmanager:...',
}
```

### Grant Lambda Permission to Read Secret

```typescript
// In infrastructure/lib/lambda-stack.ts
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

const firebaseSecret = secretsmanager.Secret.fromSecretArn(
  this,
  'FirebaseSecret',
  'arn:aws:secretsmanager:...'
);

firebaseSecret.grantRead(this.uploadHandler);
```

## Step 6: Update CORS Configuration

Ensure your API Gateway and S3 buckets allow requests from your frontend domain:

### API Gateway CORS

```typescript
// In infrastructure/lib/api-gateway-stack.ts
defaultCorsPreflightOptions: {
  allowOrigins: [
    'https://your-frontend-domain.com',
    'http://localhost:5173', // for development
  ],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}
```

### S3 CORS

```typescript
// In infrastructure/lib/storage-stack.ts
cors: [
  {
    allowedOrigins: [
      'https://your-frontend-domain.com',
      'http://localhost:5173',
    ],
    allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
    allowedHeaders: ['*'],
    maxAge: 3000,
  },
],
```

## Step 7: Deploy Updated Infrastructure

```bash
cd infrastructure
npm run deploy
```

## Step 8: Test Authentication

### Test Login Flow

1. Start frontend: `cd frontend && npm run dev`
2. Click "Sign in with Google"
3. Complete Google OAuth flow
4. Verify you're redirected back to the app
5. Check browser console for user info

### Test API Authentication

```bash
# Get ID token from browser (open DevTools Console):
firebase.auth().currentUser.getIdToken().then(console.log)

# Test upload endpoint with token
curl -X POST https://your-api.amazonaws.com/upload \
  -H "Authorization: Bearer <YOUR_ID_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"fileName": "test.pdf", "fileType": "application/pdf", "fileSize": 1024}'
```

## Step 9: Create First Admin User

See [ADMIN_GUIDE.md](./ADMIN_GUIDE.md) for creating the first admin user.

## Security Best Practices

### ✅ DO:
- Store service account key in AWS Secrets Manager
- Use environment variables for configuration
- Restrict CORS to specific domains
- Enable Firebase App Check for production
- Rotate service account keys periodically
- Use HTTPS for all frontend domains
- Validate tokens server-side (never trust client)

### ❌ DON'T:
- Commit service account keys to Git
- Use wildcard CORS origins in production
- Store Firebase config in public repositories
- Disable email verification for sensitive operations
- Use Firebase Admin SDK in frontend code
- Share service account keys between environments

## Troubleshooting

### "Invalid authentication token"

**Cause**: Token expired or invalid

**Solution**:
- Frontend: Call `firebase.auth().currentUser.getIdToken(true)` to refresh
- Check token expiration (1 hour by default)
- Verify Firebase project ID matches backend config

### "CORS error"

**Cause**: Frontend domain not in authorized list

**Solution**:
- Add domain to Firebase Authorized Domains
- Update API Gateway CORS configuration
- Update S3 bucket CORS configuration

### "Permission denied"

**Cause**: Lambda can't read Secrets Manager

**Solution**:
- Verify secret ARN is correct
- Check IAM role has `secretsmanager:GetSecretValue` permission
- Ensure secret is in same region as Lambda

### "Email not verified"

**Cause**: User hasn't verified email

**Solution**:
- Send verification email: `firebase.auth().currentUser.sendEmailVerification()`
- Check spam folder
- Resend verification link

## Additional Resources

- [Firebase Authentication Docs](https://firebase.google.com/docs/auth)
- [Firebase Admin SDK Docs](https://firebase.google.com/docs/admin/setup)
- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)
- [Google Identity Platform](https://cloud.google.com/identity-platform)

## Support

For issues or questions:
1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Review Firebase Console logs
3. Check CloudWatch logs for Lambda errors
4. Contact your system administrator
