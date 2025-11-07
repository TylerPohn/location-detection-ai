// Composite hook for upload flow with notifications and navigation

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
