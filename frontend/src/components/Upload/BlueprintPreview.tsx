// Blueprint Preview Component
import { useEffect, useState } from 'react';
import { Box, Card, CardContent, CardMedia, Typography, IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

interface BlueprintPreviewProps {
  file: File;
  onRemove: () => void;
}

export function BlueprintPreview({ file, onRemove }: BlueprintPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string>('');

  useEffect(() => {
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Cleanup
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card>
      <Box sx={{ position: 'relative' }}>
        <CardMedia
          component="img"
          image={previewUrl}
          alt={file.name}
          sx={{
            maxHeight: 400,
            objectFit: 'contain',
            backgroundColor: 'grey.900',
          }}
        />
        <IconButton
          onClick={onRemove}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            backgroundColor: 'background.paper',
            '&:hover': {
              backgroundColor: 'background.default',
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>
      <CardContent>
        <Typography variant="body1" noWrap>
          {file.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {formatFileSize(file.size)} • {file.type}
        </Typography>
      </CardContent>
    </Card>
  );
}
