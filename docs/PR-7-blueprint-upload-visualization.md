# PR-7: Blueprint Upload and Visualization

## Overview
Implement file upload UI with drag-and-drop, preview functionality, and progress tracking. Integrate with API Gateway for pre-signed URL uploads.

## Dependencies
**Requires:**
- PR-3 (S3 Storage and API Gateway)
- PR-6 (React Frontend Foundation)

## Objectives
- Create drag-and-drop file upload component
- Implement file validation (type, size)
- Show upload progress and loading states
- Display blueprint preview after upload
- Integrate with upload API endpoint
- Handle errors gracefully with user feedback

## Detailed Steps

### 1. Create API Service
**Estimated Time:** 25 minutes

```typescript
// frontend/src/services/api.ts
import { env } from '@/config/env';
import type { UploadRequest, UploadResponse, DetectionResult, ApiError } from '@/types/api';

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = env.apiBaseUrl;
  }

  async requestUploadUrl(request: UploadRequest): Promise<UploadResponse> {
    const response = await fetch(`${this.baseUrl}/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.message || 'Failed to request upload URL');
    }

    return response.json();
  }

  async uploadToS3(url: string, file: File, onProgress?: (progress: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = Math.round((e.loaded / e.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('PUT', url);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  }

  async getJobStatus(jobId: string): Promise<DetectionResult> {
    const response = await fetch(`${this.baseUrl}/status/${jobId}`);

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.message || 'Failed to fetch job status');
    }

    return response.json();
  }
}

export const apiService = new ApiService();
```

**Verification:** Import apiService in a component and verify TypeScript types are recognized.

### 2. Create Upload Hook
**Estimated Time:** 30 minutes

```typescript
// frontend/src/hooks/useUpload.ts
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiService } from '@/services/api';
import { ROUTES } from '@/types/routes';

interface UploadState {
  stage: 'idle' | 'requesting' | 'uploading' | 'processing' | 'success' | 'error';
  progress: number;
  error: string | null;
}

export function useUpload() {
  const navigate = useNavigate();
  const [state, setState] = useState<UploadState>({
    stage: 'idle',
    progress: 0,
    error: null,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Stage 1: Request upload URL
      setState({ stage: 'requesting', progress: 0, error: null });

      const uploadRequest = {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      };

      const { jobId, uploadUrl } = await apiService.requestUploadUrl(uploadRequest);

      // Stage 2: Upload to S3
      setState({ stage: 'uploading', progress: 0, error: null });

      await apiService.uploadToS3(uploadUrl, file, (progress) => {
        setState((prev) => ({ ...prev, progress }));
      });

      // Stage 3: Processing
      setState({ stage: 'processing', progress: 100, error: null });

      return jobId;
    },
    onSuccess: (jobId) => {
      setState({ stage: 'success', progress: 100, error: null });
      // Navigate to results page after short delay
      setTimeout(() => {
        navigate(ROUTES.RESULTS.replace(':jobId', jobId));
      }, 1500);
    },
    onError: (error) => {
      setState({
        stage: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Upload failed',
      });
    },
  });

  const reset = () => {
    setState({ stage: 'idle', progress: 0, error: null });
  };

  return {
    upload: uploadMutation.mutate,
    ...state,
    isUploading: uploadMutation.isPending,
    reset,
  };
}
```

**Verification:** Import hook and verify TypeScript types work.

### 3. Create File Upload Component
**Estimated Time:** 45 minutes

```tsx
// frontend/src/components/Upload/FileUpload.tsx
import { useCallback, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  LinearProgress,
  Alert,
} from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isUploading: boolean;
  progress: number;
  error: string | null;
}

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function FileUpload({ onFileSelect, isUploading, progress, error }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateFile = (file: File): boolean => {
    setValidationError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setValidationError(
        `Invalid file type. Please upload PNG, JPEG, or PDF files.`
      );
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      setValidationError(
        `File size exceeds 10MB limit. Please choose a smaller file.`
      );
      return false;
    }

    return true;
  };

  const handleFile = (file: File) => {
    if (validateFile(file)) {
      onFileSelect(file);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [onFileSelect]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <Box>
      <Paper
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        sx={{
          p: 4,
          border: dragActive ? '2px dashed' : '2px dashed transparent',
          borderColor: dragActive ? 'primary.main' : 'grey.700',
          backgroundColor: dragActive ? 'action.hover' : 'background.paper',
          transition: 'all 0.2s',
          cursor: isUploading ? 'not-allowed' : 'pointer',
          opacity: isUploading ? 0.6 : 1,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <UploadIcon sx={{ fontSize: 64, color: 'primary.main' }} />

          <Typography variant="h5" align="center">
            {dragActive ? 'Drop your blueprint here' : 'Upload Blueprint'}
          </Typography>

          <Typography variant="body2" color="text.secondary" align="center">
            Drag and drop your blueprint file, or click to browse
          </Typography>

          <Button
            component="label"
            variant="contained"
            disabled={isUploading}
            startIcon={<UploadIcon />}
          >
            Choose File
            <input
              type="file"
              hidden
              accept={ACCEPTED_TYPES.join(',')}
              onChange={handleFileInput}
              disabled={isUploading}
            />
          </Button>

          <Typography variant="caption" color="text.secondary">
            Supported formats: PNG, JPEG, PDF (max 10MB)
          </Typography>
        </Box>

        {isUploading && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" align="center" gutterBottom>
              Uploading... {progress}%
            </Typography>
            <LinearProgress variant="determinate" value={progress} />
          </Box>
        )}
      </Paper>

      {(validationError || error) && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {validationError || error}
        </Alert>
      )}
    </Box>
  );
}
```

**Verification:** Import component and verify it renders.

### 4. Create Upload Progress Component
**Estimated Time:** 25 minutes

```tsx
// frontend/src/components/Upload/UploadProgress.tsx
import { Box, Card, CardContent, Typography, LinearProgress, Stepper, Step, StepLabel } from '@mui/material';
import { CheckCircle, CloudUpload, AutoAwesome, CheckCircleOutline } from '@mui/icons-material';

interface UploadProgressProps {
  stage: 'requesting' | 'uploading' | 'processing' | 'success';
  progress: number;
}

const STEPS = [
  { key: 'requesting', label: 'Preparing Upload', icon: CloudUpload },
  { key: 'uploading', label: 'Uploading Blueprint', icon: CloudUpload },
  { key: 'processing', label: 'Detecting Rooms', icon: AutoAwesome },
  { key: 'success', label: 'Complete', icon: CheckCircle },
];

export function UploadProgress({ stage, progress }: UploadProgressProps) {
  const activeStepIndex = STEPS.findIndex((step) => step.key === stage);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Processing Your Blueprint
        </Typography>

        <Stepper activeStep={activeStepIndex} sx={{ mt: 3, mb: 3 }}>
          {STEPS.map((step) => (
            <Step key={step.key}>
              <StepLabel
                StepIconComponent={
                  activeStepIndex > STEPS.findIndex((s) => s.key === step.key)
                    ? CheckCircleOutline
                    : step.icon
                }
              >
                {step.label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        {stage === 'uploading' && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {progress}% uploaded
            </Typography>
            <LinearProgress variant="determinate" value={progress} />
          </Box>
        )}

        {stage === 'processing' && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              AI is analyzing your blueprint...
            </Typography>
            <LinearProgress />
          </Box>
        )}

        {stage === 'success' && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <CheckCircle color="success" sx={{ fontSize: 48 }} />
            <Typography variant="body1" sx={{ mt: 1 }}>
              Processing complete! Redirecting...
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
```

**Verification:** Import and render with test props.

### 5. Create Blueprint Preview Component
**Estimated Time:** 30 minutes

```tsx
// frontend/src/components/Upload/BlueprintPreview.tsx
import { useEffect, useState } from 'react';
import { Box, Card, CardContent, CardMedia, Typography, IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

interface BlueprintPreviewProps {
  file: File;
  onRemove: () => void;
}

export function BlueprintPreview({ file, onRemove }: BlueprintPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string>('');

  useEffect(() => {
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Cleanup
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card>
      <Box sx={{ position: 'relative' }}>
        <CardMedia
          component="img"
          image={previewUrl}
          alt={file.name}
          sx={{
            maxHeight: 400,
            objectFit: 'contain',
            backgroundColor: 'grey.900',
          }}
        />
        <IconButton
          onClick={onRemove}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            backgroundColor: 'background.paper',
            '&:hover': {
              backgroundColor: 'background.default',
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>
      <CardContent>
        <Typography variant="body1" noWrap>
          {file.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {formatFileSize(file.size)} • {file.type}
        </Typography>
      </CardContent>
    </Card>
  );
}
```

**Verification:** Test with sample File object.

### 6. Update Upload Page
**Estimated Time:** 30 minutes

```tsx
// frontend/src/pages/UploadPage.tsx
import { useState } from 'react';
import { Container, Typography, Box, Button } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { FileUpload } from '@/components/Upload/FileUpload';
import { BlueprintPreview } from '@/components/Upload/BlueprintPreview';
import { UploadProgress } from '@/components/Upload/UploadProgress';
import { useUpload } from '@/hooks/useUpload';
import { ROUTES } from '@/types/routes';

export function UploadPage() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { upload, stage, progress, error, isUploading, reset } = useUpload();

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    reset();
  };

  const handleUpload = () => {
    if (selectedFile) {
      upload(selectedFile);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(ROUTES.HOME)}
          sx={{ mb: 2 }}
        >
          Back to Home
        </Button>
        <Typography variant="h2" gutterBottom>
          Upload Blueprint
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Upload your architectural blueprint and let AI detect room boundaries automatically.
        </Typography>
      </Box>

      {!selectedFile && !isUploading && (
        <FileUpload
          onFileSelect={handleFileSelect}
          isUploading={isUploading}
          progress={progress}
          error={error}
        />
      )}

      {selectedFile && !isUploading && (
        <Box>
          <BlueprintPreview file={selectedFile} onRemove={handleRemoveFile} />
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleUpload}
            sx={{ mt: 2 }}
          >
            Start Detection
          </Button>
        </Box>
      )}

      {isUploading && stage !== 'idle' && (
        <UploadProgress
          stage={stage as 'requesting' | 'uploading' | 'processing' | 'success'}
          progress={progress}
        />
      )}
    </Container>
  );
}
```

**Verification:** Navigate to /upload and test file selection.

### 7. Add Error Boundary
**Estimated Time:** 20 minutes

```tsx
// frontend/src/components/ErrorBoundary.tsx
import { Component, ReactNode } from 'react';
import { Box, Container, Typography, Button, Paper } from '@mui/material';
import { Error as ErrorIcon } from '@mui/icons-material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="md">
          <Paper sx={{ p: 4, mt: 8, textAlign: 'center' }}>
            <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Something went wrong
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              {this.state.error?.message || 'An unexpected error occurred'}
            </Typography>
            <Button
              variant="contained"
              onClick={() => window.location.reload()}
              sx={{ mt: 2 }}
            >
              Reload Page
            </Button>
          </Paper>
        </Container>
      );
    }

    return this.props.children;
  }
}
```

Update App.tsx:

```tsx
// frontend/src/App.tsx - Wrap with ErrorBoundary
import { ErrorBoundary } from '@/components/ErrorBoundary';

// ... existing imports ...

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {/* ... rest of app ... */}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
```

**Verification:** Test error boundary by throwing test error.

## Acceptance Criteria

- [ ] API service implemented with upload and status methods
- [ ] useUpload hook manages upload state machine
- [ ] File validation checks type and size
- [ ] Drag-and-drop file upload works
- [ ] File preview shows selected blueprint
- [ ] Upload progress displays percentage
- [ ] Stepper shows current stage
- [ ] Success state redirects to results page
- [ ] Error messages display clearly
- [ ] Error boundary catches React errors
- [ ] All components are responsive
- [ ] TypeScript types are properly defined

## Testing Instructions

```bash
cd frontend

# Start dev server
npm run dev

# Navigate to /upload
# Test cases:

# 1. File validation
# - Try uploading unsupported file (e.g., .txt) - should show error
# - Try uploading file > 10MB - should show error

# 2. Drag and drop
# - Drag PNG file over upload area - border should highlight
# - Drop file - should show preview

# 3. File selection
# - Click "Choose File" button
# - Select valid blueprint image
# - Should show preview with file info

# 4. Upload flow (with API running)
# - Select valid file
# - Click "Start Detection"
# - Should show progress stepper
# - Progress bar should update
# - Should redirect to results page

# 5. Error handling
# - Disconnect network
# - Try uploading
# - Should show error message

# 6. Remove file
# - Select file
# - Click X button on preview
# - Should return to upload state
```

## Estimated Total Time
**3-4 hours** for a junior engineer following step-by-step.

## Next Steps
After PR-7 is merged:
- **PR-8** (API Integration) - can now test with real backend

## Notes for Junior Engineers

- **File objects are browser APIs** - you can create preview URLs with URL.createObjectURL
- **XHR for progress** - fetch() doesn't support upload progress, use XMLHttpRequest
- **Cleanup URLs** - always revoke object URLs to prevent memory leaks
- **File validation is critical** - validate both client and server side
- **Drag events need preventDefault** - or browser will open the file
- **State machine pattern** - upload goes through specific stages in order
- **Error boundaries catch React errors** - not async errors or event handlers
- **Use MUI components** - they're already styled with your theme
