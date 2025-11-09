// Blueprint Preview Component
import { useEffect, useState } from 'react';
import { Box, Card, CardContent, CardMedia, Typography, IconButton, alpha, keyframes, useTheme } from '@mui/material';
import { Close as CloseIcon, CheckCircle, Image as ImageIcon } from '@mui/icons-material';

const fadeIn = keyframes`
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
`;

const slideIn = keyframes`
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

interface BlueprintPreviewProps {
  file: File;
  onRemove: () => void;
}

export function BlueprintPreview({ file, onRemove }: BlueprintPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [imageLoaded, setImageLoaded] = useState(false);
  const theme = useTheme();

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
    <Card
      sx={{
        animation: `${fadeIn} 0.5s ease-out`,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.1)}`,
        overflow: 'hidden',
        transition: 'all 0.3s',
        '&:hover': {
          boxShadow: `0 12px 40px ${alpha(theme.palette.primary.main, 0.2)}`,
          transform: 'translateY(-4px)',
        },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          background: `linear-gradient(135deg, ${alpha(theme.palette.background.default, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.9)} 100%)`,
        }}
      >
        {!imageLoaded && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 1,
            }}
          >
            <ImageIcon
              sx={{
                fontSize: 64,
                color: alpha(theme.palette.primary.main, 0.3),
                animation: `${fadeIn} 1s ease-in-out infinite alternate`,
              }}
            />
          </Box>
        )}

        <CardMedia
          component="img"
          image={previewUrl}
          alt={file.name}
          onLoad={() => setImageLoaded(true)}
          sx={{
            maxHeight: 500,
            objectFit: 'contain',
            backgroundColor: 'transparent',
            p: 2,
            opacity: imageLoaded ? 1 : 0,
            transition: 'opacity 0.5s ease-in',
          }}
        />

        <IconButton
          onClick={onRemove}
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            bgcolor: alpha(theme.palette.error.main, 0.9),
            color: 'white',
            boxShadow: `0 4px 12px ${alpha(theme.palette.error.main, 0.4)}`,
            '&:hover': {
              bgcolor: theme.palette.error.dark,
              transform: 'scale(1.1) rotate(90deg)',
              boxShadow: `0 6px 16px ${alpha(theme.palette.error.main, 0.6)}`,
            },
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <CloseIcon />
        </IconButton>

        <Box
          sx={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            bgcolor: alpha(theme.palette.success.main, 0.9),
            color: 'white',
            borderRadius: 2,
            px: 1.5,
            py: 0.5,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            boxShadow: `0 4px 12px ${alpha(theme.palette.success.main, 0.4)}`,
            animation: `${slideIn} 0.5s ease-out 0.3s both`,
          }}
        >
          <CheckCircle sx={{ fontSize: 18 }} />
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            Ready
          </Typography>
        </Box>
      </Box>

      <CardContent
        sx={{
          background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.background.default, 0.8)} 100%)`,
          borderTop: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <ImageIcon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
          <Typography variant="body1" sx={{ fontWeight: 600, flexGrow: 1 }} noWrap>
            {file.name}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Typography
            variant="caption"
            sx={{
              px: 1,
              py: 0.5,
              borderRadius: 1,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
              fontWeight: 600,
            }}
          >
            {formatFileSize(file.size)}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              px: 1,
              py: 0.5,
              borderRadius: 1,
              bgcolor: alpha(theme.palette.secondary.main, 0.1),
              color: theme.palette.secondary.main,
              fontWeight: 600,
            }}
          >
            {file.type.split('/')[1].toUpperCase()}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
