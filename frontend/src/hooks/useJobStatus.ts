// Hook for polling job status with automatic stop conditions

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
    refetchInterval: (query) => {
      const data = query.state.data;
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
