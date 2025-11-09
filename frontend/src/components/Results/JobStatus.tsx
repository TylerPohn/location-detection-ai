// Job status display with automatic polling

import { Box, Card, CardContent, Typography, LinearProgress, Chip, Alert, alpha, keyframes, useTheme } from '@mui/material';
import { CheckCircle, Error as ErrorIcon, Schedule, AutoAwesome } from '@mui/icons-material';
import { useJobStatus } from '@/hooks/useJobStatus';

const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.9; }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const bounce = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
`;

const shimmer = keyframes`
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
`;

interface JobStatusProps {
  jobId: string;
}

export function JobStatus({ jobId }: JobStatusProps) {
  const { data, isLoading, error, isError } = useJobStatus({ jobId });
  const theme = useTheme();

  if (isLoading) {
    return (
      <Card
        sx={{
          background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.paper, 0.85)} 100%)`,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.1)}`,
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Schedule
              sx={{
                fontSize: 32,
                color: theme.palette.primary.main,
                animation: `${spin} 2s linear infinite`,
              }}
            />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Loading job status...
            </Typography>
          </Box>
          <LinearProgress
            sx={{
              height: 6,
              borderRadius: 3,
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
                background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              },
            }}
          />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Alert
        severity="error"
        icon={<ErrorIcon sx={{ animation: `${bounce} 1s ease-in-out infinite` }} />}
        sx={{
          border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
          boxShadow: `0 4px 12px ${alpha(theme.palette.error.main, 0.2)}`,
        }}
      >
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
        return <CheckCircle sx={{ animation: `${pulse} 2s ease-in-out infinite` }} />;
      case 'failed':
        return <ErrorIcon sx={{ animation: `${bounce} 1s ease-in-out infinite` }} />;
      case 'processing':
        return <AutoAwesome sx={{ animation: `${spin} 2s linear infinite` }} />;
      default:
        return <Schedule />;
    }
  };

  const statusColor = getStatusColor(data.status);

  return (
    <Card
      sx={{
        background: data.status === 'completed'
          ? `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`
          : data.status === 'failed'
          ? `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`
          : data.status === 'processing'
          ? `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`
          : alpha(theme.palette.background.paper, 0.95),
        border: `1px solid ${alpha(theme.palette[statusColor === 'default' ? 'primary' : statusColor].main, 0.3)}`,
        boxShadow: `0 8px 24px ${alpha(theme.palette[statusColor === 'default' ? 'primary' : statusColor].main, 0.15)}`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {data.status === 'processing' && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '200%',
            height: '100%',
            background: `linear-gradient(90deg, transparent, ${alpha(theme.palette.warning.main, 0.1)}, transparent)`,
            animation: `${shimmer} 2s infinite`,
          }}
        />
      )}

      <CardContent sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Job Status
          </Typography>
          <Chip
            icon={getStatusIcon(data.status)}
            label={data.status.toUpperCase()}
            color={statusColor as 'success' | 'error' | 'warning' | 'default'}
            sx={{
              fontWeight: 700,
              fontSize: '0.875rem',
              px: 1,
              boxShadow: `0 4px 12px ${alpha(theme.palette[statusColor === 'default' ? 'primary' : statusColor].main, 0.3)}`,
            }}
          />
        </Box>

        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: alpha(theme.palette.background.default, 0.5),
            mb: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', mb: 1 }}>
            <strong>Job ID:</strong> {jobId}
          </Typography>
          {data.roomCount !== undefined && (
            <Typography variant="body2" color="text.secondary">
              <strong>Rooms detected:</strong>{' '}
              <Box
                component="span"
                sx={{
                  color: theme.palette.success.main,
                  fontWeight: 700,
                  fontSize: '1.1rem',
                }}
              >
                {data.roomCount}
              </Box>
            </Typography>
          )}
        </Box>

        {data.status === 'processing' && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <AutoAwesome
                sx={{
                  color: theme.palette.warning.main,
                  animation: `${spin} 2s linear infinite`,
                }}
              />
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                Processing blueprint...
              </Typography>
            </Box>
            <LinearProgress
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: alpha(theme.palette.warning.main, 0.1),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  background: `linear-gradient(90deg, ${theme.palette.warning.main}, ${theme.palette.warning.light}, ${theme.palette.warning.main})`,
                  backgroundSize: '200% 100%',
                  animation: 'gradient 2s ease infinite',
                  '@keyframes gradient': {
                    '0%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                    '100%': { backgroundPosition: '0% 50%' },
                  },
                  boxShadow: `0 0 15px ${alpha(theme.palette.warning.main, 0.5)}`,
                },
              }}
            />
          </Box>
        )}

        {data.status === 'completed' && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 2,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.success.main, 0.1),
              border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
            }}
          >
            <CheckCircle
              sx={{
                color: theme.palette.success.main,
                fontSize: 28,
                animation: `${pulse} 2s ease-in-out infinite`,
              }}
            />
            <Typography variant="body1" sx={{ fontWeight: 600, color: theme.palette.success.main }}>
              Processing complete! Your results are ready.
            </Typography>
          </Box>
        )}

        {data.status === 'failed' && data.error && (
          <Alert
            severity="error"
            icon={<ErrorIcon sx={{ animation: `${bounce} 1s ease-in-out infinite` }} />}
            sx={{
              mt: 2,
              boxShadow: `0 4px 12px ${alpha(theme.palette.error.main, 0.2)}`,
            }}
          >
            {data.error}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
