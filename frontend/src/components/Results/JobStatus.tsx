// Job status display with automatic polling

import { Box, Card, CardContent, Typography, LinearProgress, Chip, Alert } from '@mui/material';
import { CheckCircle, Error as ErrorIcon, Schedule } from '@mui/icons-material';
import { useJobStatus } from '@/hooks/useJobStatus';

interface JobStatusProps {
  jobId: string;
}

export function JobStatus({ jobId }: JobStatusProps) {
  const { data, isLoading, error, isError } = useJobStatus({ jobId });

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Loading job status...
          </Typography>
          <LinearProgress />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Alert severity="error" icon={<ErrorIcon />}>
        {error instanceof Error ? error.message : 'Failed to load job status'}
      </Alert>
    );
  }

  if (!data) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'processing':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle />;
      case 'failed':
        return <ErrorIcon />;
      default:
        return <Schedule />;
    }
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="h6">Job Status</Typography>
          <Chip
            icon={getStatusIcon(data.status)}
            label={data.status.toUpperCase()}
            color={getStatusColor(data.status) as 'success' | 'error' | 'warning' | 'default'}
            size="small"
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Job ID: {jobId}
          </Typography>
          {data.roomCount !== undefined && (
            <Typography variant="body2" color="text.secondary">
              Rooms detected: {data.roomCount}
            </Typography>
          )}
        </Box>

        {data.status === 'processing' && (
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Processing blueprint...
            </Typography>
            <LinearProgress />
          </Box>
        )}

        {data.status === 'failed' && data.error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {data.error}
          </Alert>
        </Box>
        )}
      </CardContent>
    </Card>
  );
}
