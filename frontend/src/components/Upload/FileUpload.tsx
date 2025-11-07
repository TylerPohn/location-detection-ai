// File Upload Component with Drag-and-Drop
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
        'Invalid file type. Please upload PNG, JPEG, or PDF files.'
      );
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      setValidationError(
        'File size exceeds 10MB limit. Please choose a smaller file.'
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
