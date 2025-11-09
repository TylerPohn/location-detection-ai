/**
 * Frontend Test Utilities
 * Provides wrappers, mock data, and helper functions
 */

import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../theme/theme';
import { vi } from 'vitest';

// Mock Firebase User
export const mockFirebaseUser = {
  uid: 'test-user-uid-123',
  email: 'test@example.com',
  displayName: 'Test User',
  emailVerified: true,
  photoURL: null,
  getIdToken: vi.fn().mockResolvedValue('mock-id-token'),
  getIdTokenResult: vi.fn().mockResolvedValue({
    token: 'mock-id-token',
    claims: { role: 'user' },
  }),
};

export const mockFirebaseAdmin = {
  uid: 'test-admin-uid-456',
  email: 'admin@example.com',
  displayName: 'Test Admin',
  emailVerified: true,
  photoURL: null,
  getIdToken: vi.fn().mockResolvedValue('mock-admin-token'),
  getIdTokenResult: vi.fn().mockResolvedValue({
    token: 'mock-admin-token',
    claims: { role: 'admin' },
  }),
};

// Create test query client
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {}, // Suppress error logs in tests
    },
  });
}

interface AllProvidersProps {
  children: React.ReactNode;
}

// Wrapper with all providers
export function AllProviders({ children }: AllProvidersProps) {
  const queryClient = createTestQueryClient();

  return (
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{children}</BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

// Custom render function
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// Mock AuthContext value
export const createMockAuthContext = (overrides = {}) => ({
  user: null,
  loading: false,
  error: null,
  isAdmin: false,
  login: vi.fn(),
  logout: vi.fn(),
  ...overrides,
});

// Mock authenticated context
export const mockAuthenticatedContext = (isAdmin = false) =>
  createMockAuthContext({
    user: isAdmin ? mockFirebaseAdmin : mockFirebaseUser,
    loading: false,
    isAdmin,
  });

// Wait for async operations
export const waitFor = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Mock API responses
export const mockApiResponse = {
  upload: {
    success: {
      jobId: 'test-job-123',
      uploadUrl: 'https://s3.amazonaws.com/test-presigned-url',
      expiresIn: 3600,
    },
    error: {
      error: 'Upload failed',
    },
  },
  status: {
    pending: {
      jobId: 'test-job-123',
      status: 'pending' as const,
    },
    processing: {
      jobId: 'test-job-123',
      status: 'processing' as const,
      progress: 50,
    },
    completed: {
      jobId: 'test-job-123',
      status: 'completed' as const,
      roomCount: 5,
      rooms: [],
    },
  },
  invite: {
    created: {
      inviteId: 'test-invite-123',
      email: 'newuser@test.com',
      code: 'INVITE123',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  },
};

// Re-export everything from @testing-library/react
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
