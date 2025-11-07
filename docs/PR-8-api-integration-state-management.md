# PR-8: API Integration and State Management

## Overview
Complete API integration with TanStack Query, implement polling for job status, error handling, and persistent state management.

## Dependencies
**Requires:**
- PR-3 (S3 Storage and API Gateway)
- PR-7 (Blueprint Upload and Visualization)

## Objectives
- Implement React Query hooks for all API endpoints
- Add polling mechanism for job status updates
- Create loading skeletons and error states
- Implement retry logic with exponential backoff
- Add request caching and invalidation strategies
- Create global snackbar notifications

## Detailed Steps

### 1. Extend API Service
**Estimated Time:** 20 minutes

```typescript
// frontend/src/services/api.ts - Add retry and timeout handling
class ApiService {
  private baseUrl: string;
  private defaultTimeout = 30000; // 30 seconds

  constructor() {
    this.baseUrl = env.apiBaseUrl;
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeout = this.defaultTimeout
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  async requestUploadUrl(request: UploadRequest): Promise<UploadResponse> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/upload`, {
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

  async uploadToS3(
    url: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<void> {
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

      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload timeout'));
      });

      xhr.timeout = 5 * 60 * 1000; // 5 minutes
      xhr.open('PUT', url);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  }

  async getJobStatus(jobId: string): Promise<DetectionResult> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/status/${jobId}`,
      { method: 'GET' },
      15000 // 15 seconds for status check
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Job not found');
      }
      const error: ApiError = await response.json();
      throw new Error(error.message || 'Failed to fetch job status');
    }

    return response.json();
  }
}

export const apiService = new ApiService();
```

**Verification:** Test timeout handling with delayed responses.

### 2. Create Query Hooks
**Estimated Time:** 35 minutes

```typescript
// frontend/src/hooks/useJobStatus.ts
import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import type { DetectionResult } from '@/types/api';

interface UseJobStatusOptions {
  jobId: string;
  enabled?: boolean;
  refetchInterval?: number | false;
}

export function useJobStatus({ jobId, enabled = true, refetchInterval }: UseJobStatusOptions) {
  return useQuery<DetectionResult>({
    queryKey: ['jobStatus', jobId],
    queryFn: () => apiService.getJobStatus(jobId),
    enabled: enabled && !!jobId,
    refetchInterval: (data) => {
      // Stop polling when job is completed or failed
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false;
      }
      // Poll every 2 seconds for processing jobs
      return refetchInterval !== undefined ? refetchInterval : 2000;
    },
    retry: (failureCount, error) => {
      // Don't retry 404 errors (job not found)
      if (error instanceof Error && error.message === 'Job not found') {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => {
      // Exponential backoff: 1s, 2s, 4s
      return Math.min(1000 * 2 ** attemptIndex, 10000);
    },
  });
}
```

```typescript
// frontend/src/hooks/useUploadMutation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import type { UploadRequest } from '@/types/api';

interface UploadProgress {
  stage: 'requesting' | 'uploading' | 'processing';
  progress: number;
}

interface UseUploadMutationOptions {
  onProgress?: (progress: UploadProgress) => void;
}

export function useUploadMutation({ onProgress }: UseUploadMutationOptions = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      // Stage 1: Request upload URL
      onProgress?.({ stage: 'requesting', progress: 0 });

      const uploadRequest: UploadRequest = {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      };

      const { jobId, uploadUrl } = await apiService.requestUploadUrl(uploadRequest);

      // Stage 2: Upload to S3
      onProgress?.({ stage: 'uploading', progress: 0 });

      await apiService.uploadToS3(uploadUrl, file, (progress) => {
        onProgress?.({ stage: 'uploading', progress });
      });

      // Stage 3: Processing started
      onProgress?.({ stage: 'processing', progress: 100 });

      return jobId;
    },
    onSuccess: (jobId) => {
      // Invalidate job status query to trigger initial fetch
      queryClient.invalidateQueries({ queryKey: ['jobStatus', jobId] });
    },
  });
}
```

**Verification:** Import hooks and verify TypeScript types.

### 3. Create Notification System
**Estimated Time:** 30 minutes

```typescript
// frontend/src/context/NotificationContext.tsx
import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { Snackbar, Alert, AlertColor } from '@mui/material';

interface Notification {
  message: string;
  severity: AlertColor;
  duration?: number;
}

interface NotificationContextType {
  showNotification: (notification: Notification) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notification, setNotification] = useState<Notification | null>(null);
  const [open, setOpen] = useState(false);

  const showNotification = useCallback((notification: Notification) => {
    setNotification(notification);
    setOpen(true);
  }, []);

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={notification?.duration || 6000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleClose} severity={notification?.severity || 'info'} variant="filled">
          {notification?.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
}
```

Update App.tsx:

```tsx
// frontend/src/App.tsx
import { NotificationProvider } from '@/context/NotificationContext';

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <NotificationProvider>
          {/* ... rest of app ... */}
        </NotificationProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
```

**Verification:** Test notification system with sample messages.

### 4. Create Loading Components
**Estimated Time:** 25 minutes

```tsx
// frontend/src/components/Loading/SkeletonCard.tsx
import { Card, CardContent, Skeleton, Box } from '@mui/material';

export function SkeletonCard() {
  return (
    <Card>
      <Skeleton variant="rectangular" height={200} />
      <CardContent>
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="40%" />
        <Box sx={{ mt: 2 }}>
          <Skeleton variant="text" />
          <Skeleton variant="text" />
        </Box>
      </CardContent>
    </Card>
  );
}
```

```tsx
// frontend/src/components/Loading/LoadingOverlay.tsx
import { Backdrop, CircularProgress, Typography, Box } from '@mui/material';

interface LoadingOverlayProps {
  open: boolean;
  message?: string;
}

export function LoadingOverlay({ open, message }: LoadingOverlayProps) {
  return (
    <Backdrop
      sx={{
        color: '#fff',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        flexDirection: 'column',
        gap: 2,
      }}
      open={open}
    >
      <CircularProgress color="inherit" size={60} />
      {message && <Typography variant="h6">{message}</Typography>}
    </Backdrop>
  );
}
```

**Verification:** Render loading components with test props.

### 5. Update Upload Hook with New Mutation
**Estimated Time:** 20 minutes

```typescript
// frontend/src/hooks/useUpload.ts - Refactor to use mutation hook
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUploadMutation } from './useUploadMutation';
import { useNotification } from '@/context/NotificationContext';
import { ROUTES } from '@/types/routes';

interface UploadState {
  stage: 'idle' | 'requesting' | 'uploading' | 'processing' | 'success' | 'error';
  progress: number;
}

export function useUpload() {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [state, setState] = useState<UploadState>({
    stage: 'idle',
    progress: 0,
  });

  const uploadMutation = useUploadMutation({
    onProgress: ({ stage, progress }) => {
      setState({ stage, progress });
    },
  });

  const upload = (file: File) => {
    uploadMutation.mutate(file, {
      onSuccess: (jobId) => {
        setState({ stage: 'success', progress: 100 });
        showNotification({
          message: 'Blueprint uploaded successfully!',
          severity: 'success',
        });
        setTimeout(() => {
          navigate(ROUTES.RESULTS.replace(':jobId', jobId));
        }, 1500);
      },
      onError: (error) => {
        setState({ stage: 'error', progress: 0 });
        showNotification({
          message: error instanceof Error ? error.message : 'Upload failed',
          severity: 'error',
          duration: 10000,
        });
      },
    });
  };

  const reset = () => {
    setState({ stage: 'idle', progress: 0 });
    uploadMutation.reset();
  };

  return {
    upload,
    ...state,
    isUploading: uploadMutation.isPending,
    error: uploadMutation.error,
    reset,
  };
}
```

**Verification:** Test upload flow with notifications.

### 6. Create Status Polling Component
**Estimated Time:** 30 minutes

```tsx
// frontend/src/components/Results/JobStatus.tsx
import { Box, Card, CardContent, Typography, LinearProgress, Chip, Alert } from '@mui/material';
import { CheckCircle, Error as ErrorIcon, Schedule } from '@mui/icons-material';
import { useJobStatus } from '@/hooks/useJobStatus';

interface JobStatusProps {
  jobId: string;
}

export function JobStatus({ jobId }: JobStatusProps) {
  const { data, isLoading, error, isError } = useJobStatus({ jobId });

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Loading job status...
          </Typography>
          <LinearProgress />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Alert severity="error" icon={<ErrorIcon />}>
        {error instanceof Error ? error.message : 'Failed to load job status'}
      </Alert>
    );
  }

  if (!data) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'processing':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle />;
      case 'failed':
        return <ErrorIcon />;
      default:
        return <Schedule />;
    }
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="h6">Job Status</Typography>
          <Chip
            icon={getStatusIcon(data.status)}
            label={data.status.toUpperCase()}
            color={getStatusColor(data.status) as any}
            size="small"
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Job ID: {jobId}
          </Typography>
          {data.roomCount !== undefined && (
            <Typography variant="body2" color="text.secondary">
              Rooms detected: {data.roomCount}
            </Typography>
          )}
        </Box>

        {data.status === 'processing' && (
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Processing blueprint...
            </Typography>
            <LinearProgress />
          </Box>
        )}

        {data.status === 'failed' && data.error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {data.error}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
```

**Verification:** Test with different job statuses.

### 7. Create Retry Logic Component
**Estimated Time:** 20 minutes

```tsx
// frontend/src/components/Error/RetryError.tsx
import { Box, Paper, Typography, Button, Alert } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

interface RetryErrorProps {
  message: string;
  onRetry: () => void;
  retryCount?: number;
  maxRetries?: number;
}

export function RetryError({ message, onRetry, retryCount = 0, maxRetries = 3 }: RetryErrorProps) {
  const canRetry = retryCount < maxRetries;

  return (
    <Paper sx={{ p: 4 }}>
      <Alert severity="error" sx={{ mb: 2 }}>
        {message}
      </Alert>

      {canRetry && (
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Attempt {retryCount + 1} of {maxRetries}
          </Typography>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={onRetry}
            sx={{ mt: 1 }}
          >
            Retry
          </Button>
        </Box>
      )}

      {!canRetry && (
        <Typography variant="body2" color="text.secondary" align="center">
          Maximum retry attempts reached. Please try again later or contact support.
        </Typography>
      )}
    </Paper>
  );
}
```

**Verification:** Test retry component with different counts.

### 8. Update Query Client Configuration
**Estimated Time:** 15 minutes

```typescript
// frontend/src/config/queryClient.ts - Enhanced configuration
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry 404s or 401s
        if (error instanceof Error) {
          if (error.message.includes('404') || error.message.includes('401')) {
            return false;
          }
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    },
    mutations: {
      retry: 0, // Don't retry mutations by default
      onError: (error) => {
        console.error('Mutation error:', error);
      },
    },
  },
});

// Error handling for network errors
queryClient.setDefaultOptions({
  queries: {
    onError: (error) => {
      console.error('Query error:', error);
    },
  },
});
```

**Verification:** Test query caching and retry behavior.

## Acceptance Criteria

- [ ] API service has timeout and retry handling
- [ ] useUploadMutation hook properly manages upload flow
- [ ] useJobStatus hook polls for status updates
- [ ] Polling stops when job completes or fails
- [ ] Exponential backoff implemented for retries
- [ ] Global notification system works
- [ ] Loading skeletons display during data fetching
- [ ] Error states show retry options
- [ ] Query caching prevents unnecessary API calls
- [ ] Network errors are handled gracefully
- [ ] TypeScript types are complete and accurate

## Testing Instructions

```bash
cd frontend

# Start dev server
npm run dev

# Test scenarios:

# 1. Upload flow with polling
# - Upload a blueprint
# - Should see status polling every 2 seconds
# - Polling should stop when completed

# 2. Error handling
# - Disable backend API
# - Try uploading
# - Should see error notification
# - Should show retry option

# 3. Timeout handling
# - Use browser DevTools to throttle network to "Slow 3G"
# - Try uploading
# - Should timeout and show error

# 4. Cache behavior
# - Check job status
# - Refresh page
# - Should use cached data initially

# 5. Polling stop condition
# - View completed job
# - Network tab should show polling stopped

# 6. Notifications
# - Perform various actions
# - Should see snackbar notifications
# - Should auto-dismiss after duration

# Open React Query DevTools (bottom left)
# - Inspect query cache
# - Watch polling behavior
# - Check retry attempts
```

## Estimated Total Time
**3-4 hours** for a junior engineer following step-by-step.

## Next Steps
After PR-8 is merged:
- **PR-9** (Room Boundary Rendering) - can now fetch and display real detection results

## Notes for Junior Engineers

- **Polling with React Query** - use refetchInterval that returns false to stop
- **Exponential backoff** - `2^attemptIndex` increases delay between retries
- **Query keys** - array format allows for hierarchical invalidation
- **Mutation vs Query** - mutations for POST/PUT, queries for GET
- **Error boundaries catch React errors only** - use try/catch for async
- **Stale time vs GC time** - stale = when to refetch, GC = when to clear from cache
- **Context for global state** - Notifications use Context API
- **XHR for upload progress** - fetch() doesn't support progress tracking
- **TypeScript generics** - useQuery<T> sets the data type
- **DevTools are your friend** - React Query DevTools show everything
