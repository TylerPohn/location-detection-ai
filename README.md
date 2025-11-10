# Location Detection AI

AI-powered blueprint analysis system that automatically detects room boundaries from architectural floor plans using YOLOv8 deep learning and AWS serverless infrastructure.

## 🎯 Overview

Upload a blueprint image and get instant room detection with:
- **85-90% accuracy** using YOLOv8 object detection trained on AWS SageMaker
- **Real-time visualization** with interactive canvas and room selection
- **Bounding box detection** with confidence scores and area calculations
- **Serverless architecture** with AWS Lambda, API Gateway, and S3
- **Firebase authentication** for secure multi-user access

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- AWS CLI configured
- Firebase project (for authentication)

### Installation

```bash
# Install dependencies
npm install
cd frontend && npm install
cd ../backend && npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your AWS and Firebase credentials

# Deploy infrastructure
cd infrastructure
npm run deploy

# Run frontend locally
cd ../frontend
npm run dev
```

See [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md) for detailed setup instructions.

## 📁 Project Structure

```
location-detection-ai/
├── frontend/              # React + TypeScript + Vite UI
│   ├── src/
│   │   ├── components/    # UI components (canvas, room list, etc.)
│   │   ├── pages/         # Page components (home, admin, jobs)
│   │   ├── services/      # API client and Firebase
│   │   └── types/         # TypeScript definitions
│   └── public/
├── backend/
│   ├── src/
│   │   ├── lambdas/       # Lambda function handlers
│   │   │   └── user-handler/  # User management with Firebase
│   │   ├── sagemaker/     # ML inference code
│   │   │   ├── detector/  # YOLOv8 detector implementation
│   │   │   ├── Dockerfile.yolo  # Docker image for Lambda
│   │   │   └── lambda_handler_yolo.py  # Inference handler
│   │   └── training/      # Training scripts and dataset tools
│   └── tests/
├── infrastructure/        # AWS CDK (TypeScript)
│   └── lib/
│       └── lambda-stack.ts  # Lambda, API Gateway, S3, ECR
├── docs/                  # Comprehensive documentation
└── models/                # Trained YOLOv8 models (gitignored)
```

## 🧠 AI/ML Architecture

### YOLOv8 Object Detection

**Model Training (AWS SageMaker)**:
- **Dataset**: CubiCasa5k - 4,724 architectural floor plans
  - Successfully preprocessed: 4,716 images (99.8% success rate)
  - Training/validation split: 80/20
  - Annotations: SVG polygons converted to YOLO bounding box format
- **Training Configuration**:
  - Epochs: 100
  - Instance: ml.g4dn.xlarge (GPU-accelerated)
  - Duration: 63.9 minutes
  - Cost: $4.08
  - Model size: 50MB
- **Output**: YOLOv8 model (`best.pt`) detecting room bounding boxes

**Inference Pipeline**:
1. User uploads blueprint → S3 presigned URL
2. Lambda triggered with YOLOv8 Docker container (x86_64, 3GB RAM, 60s timeout)
3. Model detects rooms with confidence thresholds (0.25 conf, 0.45 IoU)
4. Returns bounding boxes `[x1, y1, x2, y2]` with confidence scores
5. Results cached in S3 and returned to frontend
6. Interactive canvas renders rectangular room boundaries with Konva.js

## 🏗️ AWS Infrastructure

- **API Gateway v2 (HTTP API)**: RESTful endpoints for upload/detection
- **Lambda Functions**:
  - `UploadHandler`: Generates presigned S3 URLs
  - `MLInferenceHandler`: YOLOv8 inference (Docker, x86_64)
  - `UserHandler`: Firebase authentication integration
- **S3 Buckets**: Blueprint storage and results cache
- **ECR**: Docker image registry for ML models
- **CloudWatch**: Logging and monitoring

**Endpoint**: `https://bqufb8be9k.execute-api.us-east-2.amazonaws.com`

## 🔑 Authentication

Firebase Authentication with role-based access control:
- **User roles**: `user`, `admin`, `analyst`
- **Protected routes**: Admin dashboard, job management
- **JWT validation**: Server-side token verification

See [docs/FIREBASE_AUTH_COMPLETE_SUMMARY.md](docs/FIREBASE_AUTH_COMPLETE_SUMMARY.md)

## 🛠️ Development

### Frontend
```bash
cd frontend
npm run dev          # Development server (http://localhost:5173)
npm run build        # Production build
npm run typecheck    # TypeScript validation
npm run lint         # ESLint
```

### Backend Testing
```bash
cd backend
npm test             # Jest unit tests
python -m pytest     # Python tests
```

### Infrastructure
```bash
cd infrastructure
npm run deploy       # Deploy to AWS
npm run diff         # Preview changes
npm run destroy      # Tear down stack
```

## 📊 Model Performance

- **Accuracy**: 85-90% room detection
- **Detection Type**: Deep learning (YOLOv8)
- **Output Format**: Bounding boxes `[x1, y1, x2, y2]`
- **Training**: 100 epochs on AWS SageMaker
- **Inference Time**: ~3-5s per blueprint

## 📚 Documentation

### Getting Started
- [Getting Started Guide](docs/GETTING_STARTED.md)
- [Product Requirements](docs/LocationDetectionAI_PRD.md)
- [Architecture Overview](docs/ARCHITECTURE.md)

### AI/ML
- [YOLO Upgrade Plan](docs/YOLO_UPGRADE_PLAN.md)
- [Dataset Analysis](docs/DATASET_ANALYSIS.md)
- [SageMaker Training](docs/SAGEMAKER_TRAINING.md)
- [Training Complete Summary](docs/TRAINING_COMPLETE.md)
- [Implementation Summary](docs/IMPLEMENTATION_SUMMARY.md)

### AWS Deployment
- [AWS Deployment Complete](docs/AWS_DEPLOYMENT_COMPLETE.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [SageMaker Deployment](backend/src/sagemaker/DEPLOYMENT.md)

### Authentication
- [Firebase Setup](docs/FIREBASE_SETUP.md)
- [Firebase Auth Implementation](docs/FIREBASE-AUTH-IMPLEMENTATION.md)
- [Backend Auth Integration](docs/BACKEND_AUTH_INTEGRATION.md)
- [Security Implementation](docs/SECURITY_IMPLEMENTATION_SUMMARY.md)

## 🔒 Security

- ✅ No secrets in git repository
- ✅ Environment variables for all credentials
- ✅ `.gitignore` configured for `.env`, `.aws/`, model files
- ✅ IAM roles with least privilege
- ✅ S3 bucket encryption
- ✅ CORS configuration for API Gateway
- ✅ Firebase Admin SDK for server-side auth

## 🚧 Known Limitations

- **Rectangular detection**: YOLO outputs axis-aligned bounding boxes, not rotated rectangles or complex shapes
- **Cold start**: Docker Lambda has ~10-15s cold start on first invocation
- **Image size**: Best results with images < 5MB
- **Single floor plans**: Multi-page PDFs not yet supported

## 🎯 Future Enhancements

- [ ] Instance segmentation for precise room boundaries (Mask R-CNN or SAM)
- [ ] Room type classification (bedroom, kitchen, bathroom, hallway)
- [ ] Export to CAD formats (DXF, DWG)
- [ ] Batch processing for multiple blueprints
- [ ] Support for rotated bounding boxes

## 📝 Contributing

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for development guidelines.

---

**Built with**: React, TypeScript, YOLOv8, PyTorch, AWS Lambda, SageMaker, Firebase, Konva.js
