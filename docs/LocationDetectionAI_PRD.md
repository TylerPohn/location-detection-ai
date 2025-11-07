# 🧭 Product Requirements Document (PRD): Location Detection AI

## 1. Introduction and Goal

### 1.1 Project Goal
The primary goal of the **Location Detection AI** project is to drastically reduce the manual effort required by users to define *locations* (rooms, hallways, etc.) on architectural blueprints.  
We aim to build an AI service capable of automatically detecting and outputting the boundaries of distinct rooms from a blueprint image or vector file.

### 1.2 Context
Innergy users currently spend significant time manually tracing room boundaries using 2D CAD tools. Automating this step is a critical feature for improving user experience and is expected to be a major selling point for our platform.  

We previously attempted to outsource this functionality, but the resulting solution was inadequate—necessitating an in-house, robust development effort.

---

## 2. Problem & Business Context

### 2.1 Problem Statement
Users waste a great deal of time drawing room boundaries (often rectangular but sometimes irregular) on architectural blueprints.  
We need an AI solution that can analyze a blueprint image or vector file and automatically identify the precise boundaries of individual rooms, automating the creation of these *location* objects.

### 2.2 Current State & Opportunity
Currently, we have an internal AI tool that successfully extracts room names and numbers after the user manually draws boundaries.  
The missing piece is the **boundary-drawing step** itself. Automating this process will save significant user effort and make the workflow nearly instantaneous.

### 2.3 Success Metrics (Impact)
| Metric | Target |
|---------|--------|
| **User Efficiency** | Reduce mapping time for a 10-room floor plan from 5 minutes to < 30 seconds |
| **Sales / Market Appeal** | Demonstrate as a key differentiator and visual “wow” moment for sales demos |

---

## 3. Proposed Solution: The Location Detection Service

We propose building a dedicated, **serverless, AWS-hosted AI service** that performs blueprint analysis and room detection.

### 3.1 Core Functional Requirement
The service **must**:
- Accept a blueprint file (PNG / JPG / PDF vector).  
- Process it via a computer vision or ML model.  
- Return the **lines and/or polygon vertices** defining each detected room.  

**Response Example:**
```json
[
  {
    "id": "room_001",
    "lines": [
      {"start": [100, 100], "end": [500, 100]},
      {"start": [500, 100], "end": [500, 300]},
      {"start": [500, 300], "end": [100, 300]},
      {"start": [100, 300], "end": [100, 100]}
    ],
    "polygon": [[100, 100], [500, 100], [500, 300], [100, 300]],
    "name_hint": "Entry Hall"
  }
]
```

This format supports both **rectangular and irregular rooms** and ensures a visually accurate, demo-ready output.

### 3.2 System Flow (High-Level)
1. User uploads a blueprint image from the **React UI**.  
2. The front-end sends the file to the **AWS API Gateway**.  
3. The backend stores the file in **S3**, then triggers the **Location Detection Service**.  
4. The service (running on **SageMaker Async Inference**) processes the image using OpenCV-based contour detection.  
5. The service returns a JSON object of detected rooms with line/polygon data.  
6. The React front-end renders the detected room outlines with accurate geometry.

---

## 4. Technical Requirements and Constraints

### 4.1 Technical Stack

#### 🧩 Front-End
- **Framework:** React + Vite  
- **UI Library:** Material UI (MUI)  
- **State & Data Layer:** TanStack Query (React Query)  
- **Visualization:** Canvas / SVG overlay (`react-konva` or `d3.js`)  
- **Build Tools:** TypeScript, ESLint, Prettier  

#### ⚙️ Backend / AI Service
- **Platform:** AWS (Serverless)  
- **Compute:** AWS Lambda + Amazon SageMaker Async Inference  
- **Storage:** Amazon S3 (for blueprints, inference inputs, and outputs)  
- **Coordination:** AWS Step Functions or EventBridge for orchestration  
- **AI Frameworks:** Custom AI pipeline deployed via **Amazon SageMaker Async Inference**, using **OpenCV (Phase 1)** and optionally **PyTorch or TensorFlow (Phase 2)** for trained ML models  
- **Model Phase 1:** OpenCV-based contour detector outputting line and polygon geometry  
- **Model Phase 2:** Trained CNN or DETR segmentation model for irregular room shapes  
- **Deployment:** Infrastructure as Code using **AWS CDK** (TypeScript)

### 4.2 Performance Benchmarks
| Metric | Requirement |
|---------|--------------|
| **Processing Latency** | < 30 seconds per blueprint |
| **Scalability** | Handle 10–100 concurrent users with auto-scaling |
| **Availability** | ≥ 99.9 % uptime |
| **Cold Start Tolerance** | ≤ 10 seconds (SageMaker Async) |

### 4.3 Off-Limits Technology
- “Black-box” or non-explainable ML solutions.  
- Unverifiable third-party AI services.  
- Any unmanaged compute outside AWS ecosystem.

---

## 5. Mock Data Strategy (for Students / MVP Testing)

### 5.1 Input Mock Data (Simulated Blueprint)
Use simplified, generic floor-plan images (public domain preferred).  
Example JSON input schema:
```json
[
  { "type": "line", "start": [100, 100], "end": [500, 100], "is_load_bearing": false },
  { "type": "line", "start": [100, 100], "end": [100, 400], "is_load_bearing": false }
]
```

### 5.2 Expected Output Mock Data (Detected Rooms)
```json
[
  {
    "id": "room_001",
    "lines": [
      {"start": [100, 100], "end": [500, 100]},
      {"start": [500, 100], "end": [500, 300]},
      {"start": [500, 300], "end": [100, 300]},
      {"start": [100, 300], "end": [100, 100]}
    ],
    "polygon": [[100, 100], [500, 100], [500, 300], [100, 300]],
    "name_hint": "Main Office"
  }
]
```

---

## 6. Architecture Overview

### 6.1 High-Level Pipeline
```
[React Front-End]
   │
   ▼
[AWS API Gateway]
   │
   ▼
[AWS Lambda → S3 Storage]
   │
   ▼
[Amazon SageMaker Async Inference (OpenCV / ML Model)]
   │
   ▼
[S3 Output → Lambda Callback → Front-End Visualization]
```

### 6.2 Model Abstraction Design
The AI layer uses a pluggable “detector” interface for clean separation between classical and ML-based implementations:

```python
class BaseDetector:
    def detect_rooms(self, image) -> List[Dict]:
        ...
```

Implementations:
- `OpenCVDetector` – Contour-based line/polygon detector (Phase 1)  
- `MLDetector` – Trained CNN/DETR segmentation model (Phase 2)  

### 6.3 Scalability & Cost Model
- **Async Inference:** Automatically scales to handle thousands of queued blueprints  
- **Average Latency:** 10–25 seconds per blueprint on `ml.m5.xlarge`  
- **Throughput:** ~100 blueprints per minute with 5 instances  
- **Billing:** Pay per inference duration only — no idle compute cost  

---

## 7. Project Deliverables

| Deliverable | Description |
|--------------|--------------|
| **Code Repository** | Fully functional frontend and backend code (GitHub preferred). |
| **Demo Video / Live Presentation** | Front-end submits mock blueprint → AI returns room lines/polygons → visualized on canvas. |
| **Brief Technical Write-up (1–2 pages)** | Methodology, model choices, and data preparation process. |
| **AI Documentation** | Detailed documentation of AWS AI/ML services and configuration used. |

---

## 8. Implementation Phases

| Phase | Description | Output |
|--------|--------------|---------|
| **Phase 1 – CV Prototype** | OpenCV contour detector producing line and polygon outputs | Working demo under 30 s latency with visually accurate outlines |
| **Phase 2 – ML Upgrade** | Train and integrate CNN or DETR model for complex blueprint segmentation | Improved accuracy and irregular room handling |

---

## 9. UI / UX Expectations

### 9.1 Front-End Design Goals
- Sleek and highly visual demo experience.  
- Immediate blueprint preview and animation of detected outlines.  
- Intuitive controls for manual adjustment and confirmation.  

### 9.2 Recommended UI Toolkit Components
- **MUI Card** + **Stepper** for upload → processing → results.  
- **Canvas/SVG Overlay** (`react-konva`) for rendering room lines/polygons.  
- **Snackbar Notifications** for status and errors.  
- **TanStack Query** for async mutation states and loading indicators.  
- **Dark theme** + animated loading skeletons for polish.

---

## 10. Security & Compliance

- Use pre-signed S3 URLs for secure uploads.  
- API Gateway protected by Cognito or IAM.  
- Encrypted data at rest (S3 SSE, KMS).  
- No PII or sensitive data processed.

---

## 11. Future Enhancements
- Multi-floor plan support.  
- Vector input (PDF CAD parsing).  
- Confidence scoring per room.  
- Integration with existing room-label extraction AI.  

---

**Document Owner:** Innergy AI Team  
**Last Updated:** November 2025
