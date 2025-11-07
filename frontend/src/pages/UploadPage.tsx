// Upload Page Component
import { useState } from 'react';
import { Container, Typography, Box, Button } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { FileUpload } from '@/components/Upload/FileUpload';
import { BlueprintPreview } from '@/components/Upload/BlueprintPreview';
import { UploadProgress } from '@/components/Upload/UploadProgress';
import { useUpload } from '@/hooks/useUpload';
import { ROUTES } from '@/types/routes';

export function UploadPage() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { upload, stage, progress, error, isUploading, reset } = useUpload();

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    reset();
  };

  const handleUpload = () => {
    if (selectedFile) {
      upload(selectedFile);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(ROUTES.HOME)}
          sx={{ mb: 2 }}
        >
          Back to Home
        </Button>
        <Typography variant="h2" gutterBottom>
          Upload Blueprint
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Upload your architectural blueprint and let AI detect room boundaries automatically.
        </Typography>
      </Box>

      {!selectedFile && !isUploading && (
        <FileUpload
          onFileSelect={handleFileSelect}
          isUploading={isUploading}
          progress={progress}
          error={error}
        />
      )}

      {selectedFile && !isUploading && (
        <Box>
          <BlueprintPreview file={selectedFile} onRemove={handleRemoveFile} />
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleUpload}
            sx={{ mt: 2 }}
          >
            Start Detection
          </Button>
        </Box>
      )}

      {isUploading && stage !== 'idle' && (
        <UploadProgress
          stage={stage as 'requesting' | 'uploading' | 'processing' | 'success'}
          progress={progress}
        />
      )}
    </Container>
  );
}
