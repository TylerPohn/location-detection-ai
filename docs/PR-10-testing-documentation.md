# PR-10: Testing and Documentation

## Overview
Comprehensive testing suite, documentation, and final integration testing for the complete Location Detection AI system.

## Dependencies
**Requires:** ALL previous PRs (PR-1 through PR-9)

## Objectives
- Set up Jest and React Testing Library
- Write unit tests for all components and hooks
- Create integration tests for API flows
- Set up E2E testing with Playwright
- Write comprehensive documentation
- Create deployment guide
- Performance testing and optimization
- Final security review

## Detailed Steps

### 1. Set Up Testing Infrastructure
**Estimated Time:** 30 minutes

```bash
cd frontend

# Install testing dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event @vitest/ui vitest jsdom

# Install MSW for API mocking
npm install --save-dev msw

# Install Playwright for E2E
npm install --save-dev @playwright/test
```

Update vite.config.ts:

```typescript
// frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/utils': path.resolve(__dirname, './src/utils'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
      ],
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
```

Create test setup:

```typescript
// frontend/src/test/setup.ts
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

afterEach(() => {
  cleanup();
});
```

**Verification:** Run `npm run test` to verify setup.

### 2. Create Test Utilities
**Estimated Time:** 25 minutes

```tsx
// frontend/src/test/utils.tsx
import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/theme/theme';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

interface AllProvidersProps {
  children: React.ReactNode;
}

function AllProviders({ children }: AllProvidersProps) {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider theme={theme}>{children}</ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function customRender(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export * from '@testing-library/react';
export { customRender as render };
```

Create mock data:

```typescript
// frontend/src/test/mockData.ts
import type { Room, DetectionResult, UploadResponse } from '@/types/api';

export const mockRoom: Room = {
  id: 'room_001',
  lines: [
    { start: [100, 100], end: [400, 100] },
    { start: [400, 100], end: [400, 300] },
    { start: [400, 300], end: [100, 300] },
    { start: [100, 300], end: [100, 100] },
  ],
  polygon: [
    [100, 100],
    [400, 100],
    [400, 300],
    [100, 300],
  ],
  area: 60000,
  perimeter: 800,
  name_hint: 'Office',
};

export const mockRooms: Room[] = [
  mockRoom,
  {
    ...mockRoom,
    id: 'room_002',
    name_hint: 'Kitchen',
  },
];

export const mockDetectionResult: DetectionResult = {
  jobId: 'test-job-123',
  status: 'completed',
  roomCount: 2,
  rooms: mockRooms,
};

export const mockUploadResponse: UploadResponse = {
  jobId: 'test-job-123',
  uploadUrl: 'https://s3.amazonaws.com/test-bucket/test-key',
  expiresIn: 3600,
};
```

**Verification:** Import test utils in a test file.

### 3. Write Component Tests
**Estimated Time:** 60 minutes

```typescript
// frontend/src/components/Upload/FileUpload.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/utils';
import { FileUpload } from './FileUpload';

describe('FileUpload', () => {
  it('renders upload area', () => {
    render(
      <FileUpload
        onFileSelect={vi.fn()}
        isUploading={false}
        progress={0}
        error={null}
      />
    );

    expect(screen.getByText(/upload blueprint/i)).toBeInTheDocument();
  });

  it('shows error message when provided', () => {
    render(
      <FileUpload
        onFileSelect={vi.fn()}
        isUploading={false}
        progress={0}
        error="Upload failed"
      />
    );

    expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
  });

  it('shows progress when uploading', () => {
    render(
      <FileUpload
        onFileSelect={vi.fn()}
        isUploading={true}
        progress={50}
        error={null}
      />
    );

    expect(screen.getByText(/uploading\.\.\. 50%/i)).toBeInTheDocument();
  });

  it('calls onFileSelect when file is chosen', async () => {
    const handleFileSelect = vi.fn();
    render(
      <FileUpload
        onFileSelect={handleFileSelect}
        isUploading={false}
        progress={0}
        error={null}
      />
    );

    const file = new File(['blueprint'], 'test.png', { type: 'image/png' });
    const input = screen.getByLabelText(/choose file/i).querySelector('input');

    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
      expect(handleFileSelect).toHaveBeenCalledWith(file);
    }
  });

  it('validates file type', async () => {
    const handleFileSelect = vi.fn();
    render(
      <FileUpload
        onFileSelect={handleFileSelect}
        isUploading={false}
        progress={0}
        error={null}
      />
    );

    const file = new File(['text'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByLabelText(/choose file/i).querySelector('input');

    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
      expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
      expect(handleFileSelect).not.toHaveBeenCalled();
    }
  });
});
```

```typescript
// frontend/src/components/Visualization/RoomList.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/utils';
import { RoomList } from './RoomList';
import { mockRooms } from '@/test/mockData';

describe('RoomList', () => {
  it('renders all rooms', () => {
    render(
      <RoomList
        rooms={mockRooms}
        selectedRoomId={null}
        onRoomSelect={vi.fn()}
      />
    );

    expect(screen.getByText('room_001')).toBeInTheDocument();
    expect(screen.getByText('room_002')).toBeInTheDocument();
  });

  it('highlights selected room', () => {
    render(
      <RoomList
        rooms={mockRooms}
        selectedRoomId="room_001"
        onRoomSelect={vi.fn()}
      />
    );

    const room1 = screen.getByText('room_001').closest('div');
    expect(room1).toHaveClass('Mui-selected');
  });

  it('calls onRoomSelect when room is clicked', () => {
    const handleSelect = vi.fn();
    render(
      <RoomList
        rooms={mockRooms}
        selectedRoomId={null}
        onRoomSelect={handleSelect}
      />
    );

    fireEvent.click(screen.getByText('room_001'));
    expect(handleSelect).toHaveBeenCalledWith(mockRooms[0]);
  });
});
```

**Verification:** Run `npm run test` and verify tests pass.

### 4. Write Hook Tests
**Estimated Time:** 40 minutes

```typescript
// frontend/src/hooks/useUpload.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUpload } from './useUpload';
import * as apiService from '@/services/api';

vi.mock('@/services/api');
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));
vi.mock('@/context/NotificationContext', () => ({
  useNotification: () => ({ showNotification: vi.fn() }),
}));

describe('useUpload', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('initializes with idle state', () => {
    const { result } = renderHook(() => useUpload(), { wrapper });

    expect(result.current.stage).toBe('idle');
    expect(result.current.progress).toBe(0);
    expect(result.current.isUploading).toBe(false);
  });

  it('handles successful upload', async () => {
    vi.spyOn(apiService.apiService, 'requestUploadUrl').mockResolvedValue({
      jobId: 'test-123',
      uploadUrl: 'https://s3.test.com/upload',
      expiresIn: 3600,
    });

    vi.spyOn(apiService.apiService, 'uploadToS3').mockResolvedValue(undefined);

    const { result } = renderHook(() => useUpload(), { wrapper });

    const file = new File(['blueprint'], 'test.png', { type: 'image/png' });
    result.current.upload(file);

    await waitFor(() => {
      expect(result.current.stage).toBe('success');
    });
  });

  it('handles upload error', async () => {
    vi.spyOn(apiService.apiService, 'requestUploadUrl').mockRejectedValue(
      new Error('Upload failed')
    );

    const { result } = renderHook(() => useUpload(), { wrapper });

    const file = new File(['blueprint'], 'test.png', { type: 'image/png' });
    result.current.upload(file);

    await waitFor(() => {
      expect(result.current.stage).toBe('error');
    });
  });
});
```

**Verification:** Run hook tests and verify they pass.

### 5. Set Up E2E Testing
**Estimated Time:** 45 minutes

```bash
# Initialize Playwright
npx playwright install
```

```typescript
// frontend/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

Create E2E test:

```typescript
// frontend/e2e/upload-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Blueprint Upload Flow', () => {
  test('complete upload and view results', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    expect(await page.title()).toBe('Location Detection AI');

    // Click get started
    await page.click('text=Get Started');
    await expect(page).toHaveURL('/upload');

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('e2e/fixtures/sample-blueprint.png');

    // Wait for preview
    await expect(page.locator('text=sample-blueprint.png')).toBeVisible();

    // Click start detection
    await page.click('text=Start Detection');

    // Wait for processing
    await expect(page.locator('text=Processing')).toBeVisible();

    // Should redirect to results (with mock)
    await page.waitForURL('/results/*', { timeout: 10000 });

    // Verify results page loaded
    await expect(page.locator('text=Detection Results')).toBeVisible();
  });

  test('validates file type', async ({ page }) => {
    await page.goto('/upload');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('e2e/fixtures/invalid-file.txt');

    await expect(page.locator('text=Invalid file type')).toBeVisible();
  });
});
```

**Verification:** Run `npx playwright test` to execute E2E tests.

### 6. Backend Testing
**Estimated Time:** 50 minutes

```python
# backend/src/detector/tests/test_integration.py
import pytest
import boto3
from moto import mock_s3
import json
from detector.lambda_handler import handler

@mock_s3
def test_lambda_handler_success():
    """Test Lambda handler with mock S3."""
    # Setup mock S3
    s3 = boto3.client('s3', region_name='us-east-1')
    bucket_name = 'test-blueprints'
    s3.create_bucket(Bucket=bucket_name)

    # Upload test image
    with open('tests/fixtures/sample_blueprint.png', 'rb') as f:
        s3.put_object(
            Bucket=bucket_name,
            Key='blueprints/test-job.png',
            Body=f.read()
        )

    # Create event
    event = {
        'bucket': bucket_name,
        'key': 'blueprints/test-job.png',
        'jobId': 'test-job',
        'resultsBucket': bucket_name,
        'params': {
            'min_area': 1000,
            'max_area': 1000000
        }
    }

    # Invoke handler
    response = handler(event, None)

    # Assertions
    assert response['statusCode'] == 200
    body = json.loads(response['body'])
    assert body['jobId'] == 'test-job'
    assert body['status'] == 'completed'
    assert 'rooms' in body
    assert len(body['rooms']) > 0

@mock_s3
def test_lambda_handler_invalid_image():
    """Test Lambda handler with invalid image."""
    s3 = boto3.client('s3', region_name='us-east-1')
    bucket_name = 'test-blueprints'
    s3.create_bucket(Bucket=bucket_name)

    # Upload invalid file
    s3.put_object(
        Bucket=bucket_name,
        Key='blueprints/test-job.txt',
        Body=b'not an image'
    )

    event = {
        'bucket': bucket_name,
        'key': 'blueprints/test-job.txt',
        'jobId': 'test-job',
        'resultsBucket': bucket_name
    }

    response = handler(event, None)

    assert response['statusCode'] == 500
    body = json.loads(response['body'])
    assert body['status'] == 'failed'
```

**Verification:** Run `poetry run pytest` in backend directory.

### 7. Create Comprehensive Documentation
**Estimated Time:** 60 minutes

```markdown
<!-- docs/DEPLOYMENT.md -->
# Deployment Guide

## Prerequisites

- AWS Account with appropriate permissions
- Node.js 18+
- Python 3.9+
- Docker installed
- AWS CLI configured

## Backend Deployment

### 1. Build and Push Docker Image

```bash
cd backend/src/sagemaker
export AWS_ACCOUNT_ID=your-account-id
export AWS_REGION=us-east-1
./build-and-push.sh
```

### 2. Deploy Infrastructure

```bash
cd infrastructure

# Install dependencies
npm install

# Set environment variables
export AWS_ACCOUNT_ID=your-account-id
export AWS_REGION=us-east-1
export MODEL_IMAGE_URI=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/location-detector:latest

# Deploy all stacks
npm run deploy
```

### 3. Test Backend

```bash
# Upload test blueprint
aws s3 cp tests/fixtures/sample.png \
  s3://location-detection-blueprints-dev/blueprints/test-001.png

# Monitor logs
aws logs tail /aws/sagemaker/Endpoints/location-detector-dev --follow

# Check results
aws s3 ls s3://location-detection-results-dev/sagemaker-output/
```

## Frontend Deployment

### 1. Build Frontend

```bash
cd frontend

# Install dependencies
npm install

# Set environment variables
echo "VITE_API_GATEWAY_URL=https://your-api.amazonaws.com" > .env.production

# Build
npm run build
```

### 2. Deploy to S3 + CloudFront

```bash
# Create S3 bucket for hosting
aws s3 mb s3://location-detection-frontend

# Enable static website hosting
aws s3 website s3://location-detection-frontend \
  --index-document index.html \
  --error-document index.html

# Upload build
aws s3 sync dist/ s3://location-detection-frontend

# Create CloudFront distribution (via console or CDK)
```

### 3. Test Frontend

Navigate to CloudFront URL and test:
- Upload blueprint
- View processing status
- See detection results
- Export data

## Monitoring and Maintenance

### CloudWatch Dashboards

Monitor:
- Lambda invocations and errors
- SageMaker endpoint latency
- API Gateway requests
- S3 bucket size

### Cost Optimization

- Set S3 lifecycle policies
- Use SageMaker Async Inference auto-scaling
- Enable CloudFront caching
- Review and optimize Lambda memory

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
```

```markdown
<!-- docs/API.md -->
# API Documentation

## Endpoints

### POST /upload

Request upload URL for blueprint.

**Request:**
```json
{
  "fileName": "blueprint.png",
  "fileType": "image/png",
  "fileSize": 1234567
}
```

**Response:**
```json
{
  "jobId": "uuid-v4",
  "uploadUrl": "https://s3.presigned-url",
  "expiresIn": 3600
}
```

### GET /status/{jobId}

Check job status and results.

**Response (Processing):**
```json
{
  "jobId": "uuid",
  "status": "processing",
  "progress": 50
}
```

**Response (Completed):**
```json
{
  "jobId": "uuid",
  "status": "completed",
  "roomCount": 5,
  "rooms": [...]
}
```

## Data Models

See [types/api.ts](../frontend/src/types/api.ts)
```

**Verification:** Review documentation for completeness.

### 8. Performance Testing
**Estimated Time:** 30 minutes

```typescript
// frontend/src/test/performance.test.ts
import { describe, it, expect } from 'vitest';
import { render } from '@/test/utils';
import { BlueprintCanvas } from '@/components/Visualization/BlueprintCanvas';
import { mockRooms } from '@/test/mockData';

describe('Performance Tests', () => {
  it('renders large number of rooms efficiently', async () => {
    const manyRooms = Array.from({ length: 100 }, (_, i) => ({
      ...mockRooms[0],
      id: `room_${i}`,
    }));

    const startTime = performance.now();

    render(
      <BlueprintCanvas
        imageUrl="test.png"
        rooms={manyRooms}
      />
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render in less than 1 second
    expect(renderTime).toBeLessThan(1000);
  });
});
```

**Verification:** Run performance tests.

## Acceptance Criteria

- [ ] Unit tests cover >80% of code
- [ ] All component tests pass
- [ ] All hook tests pass
- [ ] E2E tests cover main user flows
- [ ] Backend integration tests pass
- [ ] Documentation complete and accurate
- [ ] Deployment guide tested
- [ ] API documentation accurate
- [ ] Performance tests pass
- [ ] Security review completed
- [ ] All linting and type checking passes

## Testing Instructions

```bash
# Frontend tests
cd frontend
npm run test                # Unit tests
npm run test:coverage       # With coverage
npx playwright test         # E2E tests

# Backend tests
cd backend/src/detector
poetry run pytest           # Unit tests
poetry run pytest --cov     # With coverage

# Infrastructure validation
cd infrastructure
npm run test                # CDK tests
npm run synth               # Validate synthesis

# Full system test
./scripts/e2e-test.sh       # Complete flow test
```

## Estimated Total Time
**5-6 hours** for a junior engineer following step-by-step.

## Notes for Junior Engineers

- **Test coverage is important** - aim for >80% but don't just chase numbers
- **E2E tests are slow** - run unit tests frequently, E2E less often
- **Mock external dependencies** - use MSW for API mocking
- **Test behavior, not implementation** - test what users experience
- **Playwright is powerful** - can test real browser interactions
- **Coverage reports** - open `coverage/index.html` to see what's missing
- **Vitest is fast** - uses Vite's transform pipeline
- **Testing Library** - query by role/label, not implementation details
- **Fixtures** - keep test data in fixtures directory
- **CI/CD** - tests should run in GitHub Actions before merge
