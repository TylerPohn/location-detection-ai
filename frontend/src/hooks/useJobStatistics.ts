import { useMemo } from 'react';
import type { JobStatus } from '@/types/auth';

interface JobWithStatus {
  status: JobStatus;
}

interface JobStatistics {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  successRate: number;
  failureRate: number;
}

export function useJobStatistics(jobs: JobWithStatus[]): JobStatistics {
  return useMemo(() => {
    const total = jobs.length;
    const pending = jobs.filter((j) => j.status === 'pending').length;
    const processing = jobs.filter((j) => j.status === 'processing').length;
    const completed = jobs.filter((j) => j.status === 'completed').length;
    const failed = jobs.filter((j) => j.status === 'failed').length;

    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const failureRate = total > 0 ? Math.round((failed / total) * 100) : 0;

    return {
      total,
      pending,
      processing,
      completed,
      failed,
      successRate,
      failureRate,
    };
  }, [jobs]);
}
