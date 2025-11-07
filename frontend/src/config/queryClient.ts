// React Query client configuration with retry and caching strategies

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      console.error('Query error:', error);
    },
  },
});
