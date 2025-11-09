// Hook for managing file upload with progress tracking

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import { createJob } from '@/services/firestore';
import { useAuth } from '@/contexts/AuthContext';
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
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) {
        throw new Error('User must be authenticated to upload files');
      }

      // Stage 1: Request upload URL
      onProgress?.({ stage: 'requesting', progress: 0 });

      const uploadRequest: UploadRequest = {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      };

      const { jobId, uploadUrl } = await apiService.requestUploadUrl(uploadRequest);

      // Create Firestore job entry
      try {
        await createJob(jobId, user.uid, file.name);
        console.log('✅ Job entry created in Firestore:', jobId);
      } catch (error) {
        console.error('⚠️ Failed to create Firestore job entry:', error);
        // Continue with upload even if Firestore fails
      }

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
