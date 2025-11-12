// File Upload Component with Drag-and-Drop
import { useCallback, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  LinearProgress,
  Alert,
  alpha,
  keyframes,
  useTheme,
} from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';

// Animated keyframes
const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.8; }
`;

const shimmer = keyframes`
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
`;

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
  const theme = useTheme();

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
          p: 6,
          position: 'relative',
          overflow: 'hidden',
          border: '3px dashed',
          borderColor: dragActive ? 'primary.main' : alpha(theme.palette.primary.main, 0.3),
          background: dragActive
            ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.15)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`
            : `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.background.paper, 0.9)} 100%)`,
          backdropFilter: 'blur(10px)',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          cursor: isUploading ? 'not-allowed' : 'pointer',
          opacity: isUploading ? 0.7 : 1,
          transform: dragActive ? 'scale(1.02)' : 'scale(1)',
          boxShadow: dragActive
            ? `0 0 40px ${alpha(theme.palette.primary.main, 0.4)}`
            : '0 8px 32px rgba(0, 0, 0, 0.3)',
          '&::before': dragActive
            ? {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `linear-gradient(90deg, transparent, ${alpha(theme.palette.primary.main, 0.2)}, transparent)`,
                animation: `${shimmer} 2s infinite`,
              }
            : {},
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Box
            sx={{
              position: 'relative',
              animation: dragActive ? 'none' : `${float} 3s ease-in-out infinite`,
            }}
          >
            <UploadIcon
              sx={{
                fontSize: 80,
                color: 'primary.main',
                filter: `drop-shadow(0 4px 12px ${alpha(theme.palette.primary.main, 0.4)})`,
                transition: 'all 0.3s',
                transform: dragActive ? 'scale(1.1) rotate(5deg)' : 'scale(1)',
              }}
            />
            {dragActive && (
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  border: `2px solid ${theme.palette.primary.main}`,
                  animation: `${pulse} 1.5s ease-in-out infinite`,
                }}
              />
            )}
          </Box>

          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                mb: 1,
                ...(dragActive
                  ? {
                      background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }
                  : {
                      color: theme.palette.text.primary,
                    }),
                transition: 'all 0.3s',
              }}
            >
              {dragActive ? 'Drop your blueprint here!' : 'Upload Blueprint'}
            </Typography>

            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mb: 2, maxWidth: 400 }}
            >
              {dragActive
                ? 'Release to upload your file'
                : 'Drag and drop your blueprint file, or click the button below'}
            </Typography>
          </Box>

          <Button
            component="label"
            variant="contained"
            disabled={isUploading}
            size="large"
            startIcon={<UploadIcon />}
            sx={{
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 600,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.35)}`,
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                transform: 'translateY(-2px)',
                boxShadow: `0 12px 28px ${alpha(theme.palette.primary.main, 0.45)}`,
              },
              transition: 'all 0.3s',
            }}
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
          <Box sx={{ mt: 4 }}>
            <Typography
              variant="body1"
              align="center"
              gutterBottom
              sx={{ fontWeight: 600 }}
            >
              Uploading... {progress}%
            </Typography>
            <Box sx={{ position: 'relative' }}>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    boxShadow: `0 0 10px ${alpha(theme.palette.primary.main, 0.5)}`,
                  },
                }}
              />
            </Box>
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
