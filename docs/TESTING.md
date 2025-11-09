# Location Detection AI - Testing Guide

## Overview

This document describes the comprehensive testing strategy for the Location Detection AI system, including unit tests, integration tests, E2E tests, and performance tests.

## Table of Contents
- [Testing Strategy](#testing-strategy)
- [Frontend Testing](#frontend-testing)
- [Backend Testing](#backend-testing)
- [E2E Testing](#e2e-testing)
- [Performance Testing](#performance-testing)
- [CI/CD Integration](#cicd-integration)
- [Test Coverage](#test-coverage)

## Testing Strategy

### Test Pyramid

```
         /\
        /E2E\       <- 10% (Critical user flows)
       /------\
      /Integr.\    <- 20% (API, Services, AWS)
     /----------\
    /   Unit     \ <- 70% (Components, Functions, Logic)
   /--------------\
```

### Coverage Goals
- **Overall**: >80%
- **Unit Tests**: >85%
- **Integration Tests**: >75%
- **E2E Tests**: Critical paths only
- **Functions**: >80%
- **Branches**: >75%

## Frontend Testing

### Setup

```bash
cd frontend

# Install dependencies
npm install

# Run all tests
npm run test

# Run tests in UI mode
npm run test:ui

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

### Unit Testing with Vitest

**Test Structure**:
```typescript
// Component.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/utils';
import { Component } from './Component';

describe('Component', () => {
  it('renders correctly', () => {
    render(<Component />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const handleClick = vi.fn();
    render(<Component onClick={handleClick} />);

    await fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
```

**Testing Hooks**:
```typescript
// useCustomHook.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useCustomHook } from './useCustomHook';

describe('useCustomHook', () => {
  it('returns initial state', () => {
    const { result } = renderHook(() => useCustomHook());
    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('loads data successfully', async () => {
    const { result } = renderHook(() => useCustomHook());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeDefined();
    });
  });
});
```

**Mocking API Calls**:
```typescript
// With MSW (Mock Service Worker)
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.post('/api/upload', (req, res, ctx) => {
    return res(ctx.json({ jobId: 'test-123', uploadUrl: 'https://...' }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Component Testing Patterns

**1. Testing Rendering**:
```typescript
it('renders all elements', () => {
  render(<FileUpload />);

  expect(screen.getByText('Upload Blueprint')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /choose file/i })).toBeInTheDocument();
});
```

**2. Testing User Interactions**:
```typescript
it('handles file selection', async () => {
  const onFileSelect = vi.fn();
  render(<FileUpload onFileSelect={onFileSelect} />);

  const file = new File(['blueprint'], 'test.png', { type: 'image/png' });
  const input = screen.getByLabelText(/choose file/i);

  await userEvent.upload(input, file);
  expect(onFileSelect).toHaveBeenCalledWith(file);
});
```

**3. Testing Error States**:
```typescript
it('displays error message', () => {
  render(<FileUpload error="Upload failed" />);
  expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
});
```

**4. Testing Loading States**:
```typescript
it('shows loading indicator', () => {
  render(<FileUpload isUploading={true} progress={50} />);
  expect(screen.getByText(/uploading.*50%/i)).toBeInTheDocument();
});
```

### E2E Testing with Playwright

**Configuration**:
```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

**E2E Test Example**:
```typescript
// e2e/upload-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Blueprint Upload Flow', () => {
  test('complete upload to results', async ({ page }) => {
    // Navigate to home
    await page.goto('/');
    await expect(page).toHaveTitle(/Location Detection/);

    // Start upload
    await page.click('text=Get Started');
    await expect(page).toHaveURL('/upload');

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('e2e/fixtures/sample-blueprint.png');

    // Verify preview
    await expect(page.locator('text=sample-blueprint.png')).toBeVisible();

    // Start detection
    await page.click('text=Start Detection');

    // Wait for processing
    await expect(page.locator('text=Processing')).toBeVisible();

    // Wait for results
    await page.waitForURL('/results/*', { timeout: 30000 });

    // Verify results page
    await expect(page.locator('text=Detection Results')).toBeVisible();
    await expect(page.locator('[data-testid="room-list"]')).toBeVisible();
  });

  test('validates file type', async ({ page }) => {
    await page.goto('/upload');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('e2e/fixtures/invalid-file.txt');

    await expect(page.locator('text=Invalid file type')).toBeVisible();
  });

  test('shows error for oversized files', async ({ page }) => {
    await page.goto('/upload');

    // Mock large file
    await page.evaluate(() => {
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.png', {
        type: 'image/png',
      });
      // Trigger file validation
    });

    await expect(page.locator('text=File too large')).toBeVisible();
  });
});
```

**Visual Regression Testing**:
```typescript
test('visual regression', async ({ page }) => {
  await page.goto('/results/test-job-123');
  await expect(page).toHaveScreenshot('results-page.png');
});
```

## Backend Testing

### Setup

```bash
cd backend

# Install dependencies
poetry install

# Run all tests
poetry run pytest

# Run with coverage
poetry run pytest --cov

# Run specific test types
poetry run pytest -m unit
poetry run pytest -m integration
poetry run pytest -m slow
```

### Unit Testing with Pytest

**Test Structure**:
```python
# test_detector.py
import pytest
import numpy as np
from detector.room_detector import RoomDetector

class TestRoomDetector:
    @pytest.fixture
    def detector(self):
        return RoomDetector()

    def test_init(self, detector):
        assert detector is not None
        assert hasattr(detector, 'detect')

    def test_detect_rooms(self, detector, sample_image):
        rooms = detector.detect(sample_image)

        assert isinstance(rooms, list)
        assert len(rooms) > 0
        assert all('polygon' in room for room in rooms)

    def test_detect_empty_image(self, detector):
        empty_image = np.ones((100, 100, 3), dtype=np.uint8) * 255
        rooms = detector.detect(empty_image)

        assert isinstance(rooms, list)
        assert len(rooms) == 0

    @pytest.mark.parametrize('threshold,expected_count', [
        (0.3, 5),
        (0.5, 3),
        (0.8, 1),
    ])
    def test_threshold_affects_detection(self, detector, sample_image, threshold, expected_count):
        rooms = detector.detect(sample_image, threshold=threshold)
        assert len(rooms) == expected_count
```

### Integration Testing

**Testing with AWS Services**:
```python
# test_integration.py
import pytest
import boto3
from moto import mock_s3, mock_dynamodb

@pytest.mark.integration
@mock_s3
def test_upload_to_s3(s3_client, sample_image_bytes):
    """Test uploading blueprint to S3."""
    s3_client.put_object(
        Bucket='test-blueprints',
        Key='blueprints/test-001.png',
        Body=sample_image_bytes
    )

    # Verify upload
    response = s3_client.head_object(
        Bucket='test-blueprints',
        Key='blueprints/test-001.png'
    )

    assert response['ContentLength'] == len(sample_image_bytes)

@pytest.mark.integration
@mock_dynamodb
def test_save_job_to_dynamodb(dynamodb_client):
    """Test saving job to DynamoDB."""
    dynamodb_client.put_item(
        TableName='location-detection-jobs',
        Item={
            'jobId': {'S': 'test-123'},
            'status': {'S': 'processing'},
            'createdAt': {'S': '2025-11-07T17:00:00Z'}
        }
    )

    # Verify saved
    response = dynamodb_client.get_item(
        TableName='location-detection-jobs',
        Key={'jobId': {'S': 'test-123'}}
    )

    assert 'Item' in response
    assert response['Item']['status']['S'] == 'processing'
```

**Testing Lambda Handler**:
```python
# test_lambda_handler.py
import pytest
import json
from moto import mock_s3
from detector.lambda_handler import handler

@pytest.mark.integration
@mock_s3
def test_lambda_handler_success(s3_client, sample_image_bytes, lambda_context):
    """Test Lambda handler with successful detection."""
    # Setup
    s3_client.create_bucket(Bucket='test-blueprints')
    s3_client.put_object(
        Bucket='test-blueprints',
        Key='blueprints/test-job.png',
        Body=sample_image_bytes
    )

    # Create event
    event = {
        'bucket': 'test-blueprints',
        'key': 'blueprints/test-job.png',
        'jobId': 'test-job',
        'resultsBucket': 'test-results'
    }

    # Invoke handler
    response = handler(event, lambda_context)

    # Assertions
    assert response['statusCode'] == 200
    body = json.loads(response['body'])
    assert body['jobId'] == 'test-job'
    assert body['status'] == 'completed'
    assert 'rooms' in body
    assert len(body['rooms']) > 0

@pytest.mark.integration
def test_lambda_handler_invalid_image(s3_client, lambda_context):
    """Test Lambda handler with invalid image."""
    s3_client.create_bucket(Bucket='test-blueprints')
    s3_client.put_object(
        Bucket='test-blueprints',
        Key='blueprints/invalid.txt',
        Body=b'not an image'
    )

    event = {
        'bucket': 'test-blueprints',
        'key': 'blueprints/invalid.txt',
        'jobId': 'test-invalid',
        'resultsBucket': 'test-results'
    }

    response = handler(event, lambda_context)

    assert response['statusCode'] == 500
    body = json.loads(response['body'])
    assert body['status'] == 'failed'
    assert 'error' in body
```

### Performance Testing

**Load Testing**:
```python
# test_performance.py
import pytest
import time
import numpy as np

@pytest.mark.slow
def test_detection_performance(detector, large_image):
    """Test detection completes within time limit."""
    start_time = time.time()

    rooms = detector.detect(large_image)

    duration = time.time() - start_time

    assert duration < 60.0  # Should complete in less than 60 seconds
    assert len(rooms) > 0

@pytest.mark.slow
def test_batch_detection_performance(detector, multiple_rooms_image):
    """Test detection with many rooms."""
    start_time = time.time()

    rooms = detector.detect(multiple_rooms_image)

    duration = time.time() - start_time

    assert duration < 120.0  # Should complete in less than 2 minutes
    assert len(rooms) >= 10  # Should detect many rooms

@pytest.mark.slow
def test_memory_usage(detector, large_image):
    """Test memory usage stays within limits."""
    import tracemalloc

    tracemalloc.start()
    initial_memory = tracemalloc.get_traced_memory()[0]

    rooms = detector.detect(large_image)

    peak_memory = tracemalloc.get_traced_memory()[1]
    tracemalloc.stop()

    memory_increase = (peak_memory - initial_memory) / 1024 / 1024  # MB

    assert memory_increase < 500  # Less than 500MB increase
    assert len(rooms) > 0
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  frontend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: cd frontend && npm ci

      - name: Run unit tests
        run: cd frontend && npm run test:coverage

      - name: Run E2E tests
        run: cd frontend && npx playwright test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./frontend/coverage/lcov.info
          flags: frontend

  backend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'

      - name: Install Poetry
        run: |
          curl -sSL https://install.python-poetry.org | python3 -
          echo "$HOME/.local/bin" >> $GITHUB_PATH

      - name: Install dependencies
        run: cd backend && poetry install

      - name: Run tests
        run: cd backend && poetry run pytest --cov --cov-report=xml

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage.xml
          flags: backend
```

### Pre-commit Hooks

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files

  - repo: https://github.com/psf/black
    rev: 24.1.0
    hooks:
      - id: black
        files: ^backend/

  - repo: https://github.com/charliermarsh/ruff-pre-commit
    rev: v0.1.0
    hooks:
      - id: ruff
        files: ^backend/
        args: [--fix]

  - repo: local
    hooks:
      - id: frontend-tests
        name: Frontend Tests
        entry: bash -c 'cd frontend && npm run test'
        language: system
        pass_filenames: false
        files: ^frontend/
```

## Test Coverage

### Viewing Coverage Reports

**Frontend**:
```bash
cd frontend
npm run test:coverage
open coverage/index.html
```

**Backend**:
```bash
cd backend
poetry run pytest --cov --cov-report=html
open htmlcov/index.html
```

### Coverage Badges

Add to README.md:
```markdown
![Frontend Coverage](https://codecov.io/gh/your-org/location-detection-ai/branch/main/graph/badge.svg?flag=frontend)
![Backend Coverage](https://codecov.io/gh/your-org/location-detection-ai/branch/main/graph/badge.svg?flag=backend)
```

## Best Practices

### 1. Test Naming
- Use descriptive names: `test_upload_validates_file_size`
- Follow pattern: `test_<what>_<when>_<expected>`

### 2. Arrange-Act-Assert Pattern
```typescript
test('example', () => {
  // Arrange
  const input = 'test';

  // Act
  const result = process(input);

  // Assert
  expect(result).toBe('expected');
});
```

### 3. One Assertion Per Test
- Each test should verify one behavior
- Makes failures easier to debug

### 4. Use Fixtures
- Reuse common test data
- Keep tests DRY

### 5. Mock External Dependencies
- Don't make real API calls
- Use mocks/stubs for third-party services

### 6. Test Edge Cases
- Empty inputs
- Large inputs
- Invalid inputs
- Boundary conditions

### 7. Keep Tests Fast
- Unit tests: <100ms each
- Integration tests: <5s each
- E2E tests: <30s each

## Troubleshooting Tests

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common testing issues.

---

**Last Updated**: 2025-11-07
**Version**: 1.0.0
