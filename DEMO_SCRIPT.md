# Location Detection AI - Demo Script & Architecture Overview

## Project Overview
**Location Detection AI** is a cloud-native web application that uses computer vision and machine learning to automatically detect and identify rooms/locations from architectural blueprints. Users upload blueprint images, and the system processes them using AWS SageMaker-hosted ML models to return structured location data with coordinates and confidence scores.

---

## Architecture Overview

### **High-Level Architecture**
```
┌─────────────────┐
│   React SPA     │ ← User Interface (TypeScript + Material-UI)
│   (Frontend)    │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│  API Gateway    │ ← RESTful API endpoints
└────────┬────────┘
         │
    ┌────┴──────────────────────┐
    │                            │
    ▼                            ▼
┌─────────────┐          ┌──────────────┐
│   Lambda    │          │   Lambda     │
│  Functions  │          │   Functions  │
│             │          │              │
│ • Upload    │          │ • Inference  │
│ • User Mgmt │          │ • Results    │
└──────┬──────┘          └──────┬───────┘
       │                        │
       ▼                        ▼
┌─────────────┐          ┌──────────────┐
│     S3      │          │  SageMaker   │
│  Buckets    │          │   Endpoint   │
│             │          │              │
│ • Blueprints│          │ YOLO v8 Model│
│ • Results   │          │  (Custom)    │
└─────────────┘          └──────────────┘
       │
       │ Event Notification
       ▼
┌─────────────┐          ┌──────────────┐
│   Lambda    │          │  DynamoDB    │
│   Result    │──────────│    Jobs      │
│  Handler    │          │              │
└──────┬──────┘          └──────────────┘
       │
       ▼
┌─────────────┐
│  Firestore  │ ← Real-time job status updates
│   (Cloud)   │
└─────────────┘
```

### **Technology Stack**

**Frontend:**
- React 18 + TypeScript
- Material-UI (MUI) v5
- Firebase Authentication
- Firestore for real-time updates
- Vite build system

**Backend:**
- AWS Lambda (Node.js 18.x)
- API Gateway (HTTP API)
- DynamoDB (job metadata)
- S3 (file storage)
- SageMaker (ML inference)
- Firebase Admin SDK

**ML Pipeline:**
- YOLOv8 custom-trained model
- Docker containerized inference
- SageMaker real-time endpoint
- Custom preprocessing pipeline

**Infrastructure:**
- AWS CDK (TypeScript)
- Multi-stack architecture
- Environment-based deployments

---

## Component Deep Dive

### **1. Frontend Application**

**Key Features:**
- Google OAuth authentication
- Role-based access control (Admin/Student)
- Real-time job status monitoring
- Drag-and-drop file upload
- Interactive blueprint visualization with canvas
- Responsive Material-UI design

**Pages:**
- **Home**: Upload blueprints, view processing status
- **My Jobs**: Personal job history with statistics
- **Admin Dashboard**: System-wide job monitoring, user management
- **Visualization**: Interactive room detection results with canvas overlay

**Authentication Flow:**
```
1. User clicks "Sign in with Google"
2. Firebase Auth handles OAuth flow
3. Frontend receives ID token
4. Token sent in Authorization header to backend
5. Lambda verifies token with Firebase Admin SDK
6. User profile stored in Firestore + DynamoDB
```

### **2. Backend Lambda Functions**

#### **Upload Handler Lambda**
- **Path**: `/upload`
- **Method**: POST
- **Purpose**: Generate pre-signed S3 URLs for secure file uploads
- **Flow**:
  1. Verify Firebase authentication
  2. Validate file type (PNG, JPG, PDF)
  3. Validate file size (max 10MB)
  4. Generate unique job ID
  5. Create S3 pre-signed upload URL
  6. Store job metadata in DynamoDB
  7. Return upload URL to client

**Example Request:**
```json
{
  "fileName": "blueprint-floor-1.png",
  "fileType": "image/png",
  "fileSize": 2458624
}
```

**Example Response:**
```json
{
  "jobId": "a3f7c9e1-4b2d-4c8a-9f3e-8d5c7b1a2e4f",
  "uploadUrl": "https://s3.amazonaws.com/...",
  "expiresIn": 3600
}
```

#### **Inference Handler Lambda**
- **Trigger**: S3 event on blueprint upload
- **Purpose**: Invoke SageMaker endpoint for ML inference
- **Flow**:
  1. S3 event triggers Lambda
  2. Download blueprint from S3
  3. Preprocess image (resize, normalize)
  4. Invoke SageMaker endpoint with image data
  5. Parse ML model response
  6. Store results as JSON in S3 results bucket
  7. Update DynamoDB job status

**SageMaker Request Format:**
```json
{
  "image": "base64_encoded_image_data",
  "conf_threshold": 0.25,
  "iou_threshold": 0.45
}
```

**SageMaker Response Format:**
```json
{
  "detections": [
    {
      "class": "kitchen",
      "confidence": 0.92,
      "bbox": [x1, y1, x2, y2]
    },
    {
      "class": "bedroom",
      "confidence": 0.88,
      "bbox": [x1, y1, x2, y2]
    }
  ]
}
```

#### **Result Handler Lambda**
- **Trigger**: S3 event on result JSON upload
- **Purpose**: Update Firestore with completion status
- **Flow**:
  1. S3 event triggers Lambda when result JSON created
  2. Extract job ID from S3 key
  3. Update Firestore job document:
     - status: 'completed'
     - completedAt: timestamp
     - resultUrl: S3 path
  4. Frontend receives real-time update via Firestore listener

#### **User Handler Lambda**
- **Paths**:
  - `GET /users/me` - Get current user profile
  - `GET /users/me/jobs` - Get all jobs (filtered client-side)
  - `POST /users/verify-invite` - Verify invite code
  - `POST /users/complete-registration` - Complete user registration
- **Purpose**: User management and job queries
- **Authentication**: Required (except verify-invite)

### **3. ML Model Pipeline**

#### **Training Pipeline**
- **Dataset**: Custom annotated blueprints in YOLO format
- **Model**: YOLOv8n (nano) fine-tuned on blueprint data
- **Training**: AWS SageMaker training jobs
- **Preprocessing**:
  - SVG to PNG conversion
  - Image normalization
  - Data augmentation (rotation, scaling, brightness)

#### **Inference Pipeline**
- **Deployment**: SageMaker real-time endpoint
- **Container**: Custom Docker image with YOLOv8
- **Input**: Base64-encoded blueprint images
- **Processing**:
  1. Decode image
  2. Resize to 640x640 (YOLO input size)
  3. Run detection model
  4. Apply NMS (Non-Maximum Suppression)
  5. Filter by confidence threshold
  6. Return bounding boxes with class labels

**Detected Classes:**
- Kitchen
- Bedroom
- Bathroom
- Living Room
- Office
- Hallway
- Storage
- Garage

### **4. Data Flow**

#### **Complete Upload-to-Results Flow:**

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER UPLOADS BLUEPRINT                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   React Upload   │
                    │   Component      │
                    └────────┬─────────┘
                             │ POST /upload
                             ▼
                    ┌──────────────────┐
                    │  Upload Lambda   │
                    │  • Validate auth │
                    │  • Generate ID   │
                    │  • Create S3 URL │
                    └────────┬─────────┘
                             │
                   ┌─────────┴──────────┐
                   │                    │
                   ▼                    ▼
         ┌──────────────┐      ┌──────────────┐
         │  DynamoDB    │      │   Return     │
         │  Create Job  │      │  Upload URL  │
         └──────────────┘      └──────┬───────┘
                                      │
                                      ▼
                              ┌──────────────┐
                              │  Frontend    │
                              │  PUT to S3   │
                              │  Direct Upload│
                              └──────┬───────┘
                                     │
                                     ▼
                              ┌──────────────┐
                              │  S3 Bucket   │
                              │  Blueprints  │
                              └──────┬───────┘
                                     │ S3 Event
                                     ▼
                              ┌──────────────┐
                              │  Inference   │
                              │    Lambda    │
                              │              │
                              │ • Download   │
                              │ • Preprocess │
                              │ • Invoke ML  │
                              └──────┬───────┘
                                     │
                                     ▼
                              ┌──────────────┐
                              │  SageMaker   │
                              │   Endpoint   │
                              │  (YOLO v8)   │
                              └──────┬───────┘
                                     │ Detection Results
                                     ▼
                              ┌──────────────┐
                              │  Inference   │
                              │    Lambda    │
                              │  Store JSON  │
                              └──────┬───────┘
                                     │
                   ┌─────────────────┴────────────┐
                   │                              │
                   ▼                              ▼
         ┌──────────────┐              ┌──────────────┐
         │  S3 Results  │              │  DynamoDB    │
         │  Bucket      │              │  Update Job  │
         └──────┬───────┘              └──────────────┘
                │ S3 Event
                ▼
         ┌──────────────┐
         │   Result     │
         │   Handler    │
         │   Lambda     │
         └──────┬───────┘
                │
                ▼
         ┌──────────────┐
         │  Firestore   │
         │  Update Job  │
         │  status:     │
         │  'completed' │
         └──────┬───────┘
                │ Real-time listener
                ▼
         ┌──────────────┐
         │   Frontend   │
         │   Updates UI │
         │   Shows      │
         │   Results    │
         └──────────────┘
```

---

## Demo Script

### **Setup (5 minutes)**

**1. Environment Check:**
```bash
# Verify infrastructure is deployed
cd infrastructure
npx cdk list

# Check Lambda functions are active
aws lambda list-functions --region us-east-2 --query "Functions[?contains(FunctionName, 'LocDetAI')].FunctionName"

# Verify SageMaker endpoint
aws sagemaker list-endpoints --region us-east-2
```

**2. Start Frontend:**
```bash
cd frontend
npm run dev
# Application runs on http://localhost:5173
```

### **Demo Flow (15 minutes)**

#### **Part 1: Authentication & User Management (2 min)**

**Script:**
> "Let's start by signing in. The application uses Firebase Authentication with Google OAuth for secure, enterprise-grade authentication."

**Actions:**
1. Open http://localhost:5173
2. Click "Sign in with Google"
3. Complete Google OAuth flow
4. Show user profile in top-right corner

**Talking Points:**
- Firebase handles all OAuth complexity
- JWT tokens verified on backend via Firebase Admin SDK
- Role-based access control (Admin/Student roles)
- Secure session management

#### **Part 2: Blueprint Upload (3 min)**

**Script:**
> "Now I'll upload a sample blueprint. The application accepts PNG, JPG, and PDF files up to 10MB. Watch as it generates a pre-signed S3 URL for secure, direct upload without routing through our backend."

**Actions:**
1. Navigate to Home page
2. Drag and drop a sample blueprint (or use file picker)
3. Show upload progress indicator
4. Point out the job card that appears with "Processing" status

**Talking Points:**
- Pre-signed URLs eliminate backend bottleneck
- Files go directly to S3 from browser
- Job created in DynamoDB immediately
- Real-time status updates via Firestore

#### **Part 3: Processing Pipeline (4 min)**

**Script:**
> "Behind the scenes, several things are happening. Let me show you the AWS infrastructure working in real-time."

**Actions:**
1. Open AWS Console - show S3 bucket with uploaded file
2. Open CloudWatch Logs - show Inference Lambda execution
3. Explain SageMaker endpoint invocation
4. Show result JSON being created in S3 results bucket
5. Show Result Handler Lambda updating Firestore

**Talking Points:**
- S3 event automatically triggers Inference Lambda
- Lambda downloads blueprint, preprocesses, invokes SageMaker
- YOLOv8 model detects rooms with bounding boxes
- Results stored as structured JSON
- Second Lambda updates Firestore for real-time frontend updates

**AWS Console Navigation:**
```
S3 → location-detection-blueprints-development
    → Show uploaded file

CloudWatch → Log groups → /aws/lambda/LocDetAI-Dev-Lambda-InferenceHandler
    → Show recent log stream

SageMaker → Endpoints → location-detection-endpoint-dev
    → Show endpoint status and metrics

S3 → location-detection-results-development
    → Show results JSON file

Firestore → Jobs collection
    → Show job document with status: 'completed'
```

#### **Part 4: Results Visualization (3 min)**

**Script:**
> "Once processing completes, the frontend automatically updates. Let's view the results with our interactive visualization."

**Actions:**
1. Watch job card status change to "Completed"
2. Click "View Results" button
3. Show visualization page with:
   - Original blueprint displayed on canvas
   - Bounding boxes overlaid on detected rooms
   - Room list with confidence scores
   - Zoom/pan controls
4. Click on a room in the list to highlight it
5. Toggle room visibility

**Talking Points:**
- Real-time updates via Firestore listeners
- HTML Canvas for high-performance rendering
- Bounding box coordinates mapped to canvas space
- Color-coded by room type
- Confidence scores from ML model

#### **Part 5: Job History & Monitoring (2 min)**

**Script:**
> "Users can track all their jobs in the 'My Jobs' page. Admins get additional system-wide visibility."

**Actions:**
1. Navigate to "My Jobs" page
2. Show statistics cards (Total, Pending, Completed, Failed)
3. Show jobs table with status, timestamps
4. Switch to Admin Dashboard (if admin user)
5. Show all system jobs and user management

**Talking Points:**
- Personal job history for all users
- Real-time statistics and success rates
- Admin dashboard for system monitoring
- User management and invite system
- Comprehensive audit trail

#### **Part 6: Architecture Benefits (1 min)**

**Script:**
> "Let me highlight why this architecture is production-ready and scalable."

**Key Points:**
- **Serverless**: Auto-scaling, no server management
- **Cost-Efficient**: Pay per request, no idle resources
- **Real-Time**: Firestore for instant UI updates
- **Secure**: Firebase Auth + JWT verification
- **Scalable**: S3/Lambda/SageMaker all scale automatically
- **Maintainable**: TypeScript everywhere, CDK IaC
- **Observable**: CloudWatch for all components

---

## Performance Metrics

**Typical Processing Times:**
- Upload generation: ~200ms
- File upload to S3: ~1-3s (depends on file size)
- ML inference: ~2-5s (SageMaker endpoint)
- Result processing: ~500ms
- UI update: Real-time via Firestore

**Cost Estimates (per 1000 jobs):**
- Lambda executions: ~$0.50
- SageMaker inference: ~$2.00
- S3 storage/transfers: ~$0.10
- DynamoDB operations: ~$0.05
- **Total**: ~$2.65 per 1000 jobs

**Scalability:**
- Supports 1000+ concurrent uploads
- SageMaker auto-scaling based on traffic
- Lambda concurrent execution limit: 1000
- S3/DynamoDB: virtually unlimited

---

## Security Features

1. **Authentication**: Firebase OAuth with Google
2. **Authorization**: JWT token verification in Lambda
3. **Data Isolation**: User-based filtering in queries
4. **Secure Uploads**: Pre-signed URLs with expiration
5. **Network Security**: HTTPS everywhere, CORS configured
6. **Secrets Management**: Environment variables for sensitive data
7. **Role-Based Access**: Admin/Student permissions

---

## Deployment

**Infrastructure as Code (CDK):**
```bash
cd infrastructure

# Deploy all stacks
npm run deploy

# Deploy specific stack
npx cdk deploy StorageStack-dev
npx cdk deploy LambdaStack-dev
npx cdk deploy ApiStack-dev
npx cdk deploy SageMakerStack-dev
```

**Frontend Deployment:**
```bash
cd frontend

# Build for production
npm run build

# Deploy to S3 + CloudFront (or any static host)
aws s3 sync dist/ s3://your-frontend-bucket
```

---

## Monitoring & Debugging

**CloudWatch Logs:**
```bash
# Upload Lambda
aws logs tail /aws/lambda/LocDetAI-Dev-Lambda-UploadHandler --follow

# Inference Lambda
aws logs tail /aws/lambda/LocDetAI-Dev-Lambda-InferenceHandler --follow

# Result Handler Lambda
aws logs tail /aws/lambda/LocDetAI-Dev-Lambda-ResultHandler --follow

# User Handler Lambda
aws logs tail /aws/lambda/LocDetAI-Dev-Lambda-UserHandler --follow
```

**SageMaker Metrics:**
```bash
# Get endpoint metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/SageMaker \
  --metric-name ModelLatency \
  --dimensions Name=EndpointName,Value=location-detection-endpoint-dev \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Average
```

---

## Future Enhancements

1. **Multi-Floor Support**: Handle multi-page PDFs
2. **3D Visualization**: Three.js for 3D blueprint rendering
3. **Batch Processing**: Queue multiple blueprints
4. **Export Formats**: PDF reports, CAD file generation
5. **Advanced ML**: Detect furniture, dimensions, doors/windows
6. **Collaboration**: Share blueprints with teams
7. **API Access**: Public API for third-party integrations
8. **Mobile App**: React Native mobile application

---

## Conclusion

This application demonstrates enterprise-grade cloud architecture combining:
- Modern frontend (React + TypeScript)
- Serverless backend (Lambda + API Gateway)
- Advanced ML (SageMaker + YOLOv8)
- Real-time updates (Firestore)
- Infrastructure as Code (CDK)

The result is a scalable, cost-effective, and maintainable system that can process thousands of blueprints while providing real-time feedback to users.

---

## Questions & Troubleshooting

**Q: How do I add a new room type?**
A: Retrain the YOLO model with new annotations and redeploy SageMaker endpoint.

**Q: What if inference fails?**
A: Job status remains 'processing'. Check CloudWatch logs for Lambda errors.

**Q: How do I scale for more users?**
A: Increase Lambda concurrency limits and SageMaker endpoint instance count.

**Q: Can I use a different ML model?**
A: Yes, modify the SageMaker container and update the inference Lambda payload format.

**Q: How do I backup data?**
A: Enable S3 versioning and DynamoDB point-in-time recovery. Firestore has automatic backups.
