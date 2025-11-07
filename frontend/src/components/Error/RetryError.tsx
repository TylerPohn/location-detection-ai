// Error component with retry functionality

import { Box, Paper, Typography, Button, Alert } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

interface RetryErrorProps {
  message: string;
  onRetry: () => void;
  retryCount?: number;
  maxRetries?: number;
}

export function RetryError({ message, onRetry, retryCount = 0, maxRetries = 3 }: RetryErrorProps) {
  const canRetry = retryCount < maxRetries;

  return (
    <Paper sx={{ p: 4 }}>
      <Alert severity="error" sx={{ mb: 2 }}>
        {message}
      </Alert>

      {canRetry && (
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Attempt {retryCount + 1} of {maxRetries}
          </Typography>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={onRetry}
            sx={{ mt: 1 }}
          >
            Retry
          </Button>
        </Box>
      )}

      {!canRetry && (
        <Typography variant="body2" color="text.secondary" align="center">
          Maximum retry attempts reached. Please try again later or contact support.
        </Typography>
      )}
    </Paper>
  );
}
