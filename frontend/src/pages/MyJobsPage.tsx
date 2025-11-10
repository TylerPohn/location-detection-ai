import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  IconButton,
  Paper,
  alpha,
  useTheme,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import WorkIcon from '@mui/icons-material/Work';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { getUserJobs } from '@/services/api';
import { JobsTable, type JobData } from '@/components/Jobs/JobsTable';
import { JobsTableSkeleton } from '@/components/Jobs/JobsTableSkeleton';
import { useJobStatistics } from '@/hooks/useJobStatistics';
import type { DetectionResult } from '@/types/api';

export function MyJobsPage() {
  const [jobs, setJobs] = useState<JobData[]>([]);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();

  const statistics = useJobStatistics(jobs);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const jobsData = await getUserJobs();

      // Convert DetectionResult to JobData format
      const formattedJobs: JobData[] = jobsData.map((job: DetectionResult) => ({
        jobId: job.jobId,
        fileName: job.jobId, // Backend may need to return fileName
        status: job.status,
        uploadedAt: new Date().toISOString(), // Backend may need to return uploadedAt
      }));

      setJobs(formattedJobs);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  return (
    <Box
      sx={{
        px: { xs: 2, sm: 3, md: 4, lg: 6, xl: 8 },
        py: { xs: 3, md: 4, lg: 5 },
        width: '100%',
        maxWidth: '100%',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          mb: { xs: 3, md: 4 },
          p: { xs: 2.5, md: 3, lg: 4 },
          borderRadius: 3,
          background: (theme) =>
            `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          border: (theme) => `1px solid ${alpha(theme.palette.primary.light, 0.2)}`,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: { xs: 'wrap', md: 'nowrap' },
            gap: 2,
          }}
        >
          <Box>
            <Typography
              variant="h3"
              component="h1"
              sx={{
                fontWeight: 700,
                mb: 1,
                fontSize: { xs: '2rem', md: '2.5rem', lg: '3rem' },
              }}
            >
              My Jobs
            </Typography>
            <Typography
              variant="body1"
              sx={{ opacity: 0.9, fontSize: { xs: '0.875rem', md: '1rem' } }}
            >
              Track your blueprint processing jobs and view results
            </Typography>
          </Box>
          <IconButton
            onClick={fetchJobs}
            disabled={loading}
            sx={{
              bgcolor: 'rgba(255,255,255,0.15)',
              width: { xs: 48, md: 56 },
              height: { xs: 48, md: 56 },
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.25)',
                transform: 'rotate(180deg) scale(1.1)',
              },
              transition: 'all 0.4s',
            }}
          >
            <RefreshIcon sx={{ fontSize: { xs: 24, md: 28 } }} />
          </IconButton>
        </Box>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={{ xs: 2, md: 3, lg: 4 }} sx={{ mb: { xs: 3, md: 4 } }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: (theme) =>
                `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.2)} 0%, ${alpha(
                  theme.palette.secondary.dark,
                  0.1
                )} 100%)`,
              border: (theme) => `1px solid ${alpha(theme.palette.secondary.main, 0.3)}`,
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              transition: 'all 0.3s',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
              },
            }}
          >
            <CardContent sx={{ p: { xs: 2, md: 2.5, lg: 3 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <WorkIcon sx={{ mr: 1, color: 'secondary.main', fontSize: { xs: 24, md: 28 } }} />
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }}
                >
                  Total Jobs
                </Typography>
              </Box>
              <Typography
                variant="h3"
                sx={{ fontWeight: 700, fontSize: { xs: '2rem', md: '2.5rem', lg: '3rem' } }}
              >
                {statistics.total}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1, fontSize: { xs: '0.75rem', md: '0.875rem' } }}
              >
                {statistics.processing} processing
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: (theme) =>
                `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.2)} 0%, ${alpha(
                  theme.palette.warning.dark,
                  0.1
                )} 100%)`,
              border: (theme) => `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              transition: 'all 0.3s',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
              },
            }}
          >
            <CardContent sx={{ p: { xs: 2, md: 2.5, lg: 3 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <HourglassEmptyIcon
                  sx={{ mr: 1, color: 'warning.main', fontSize: { xs: 24, md: 28 } }}
                />
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }}
                >
                  Pending
                </Typography>
              </Box>
              <Typography
                variant="h3"
                sx={{ fontWeight: 700, fontSize: { xs: '2rem', md: '2.5rem', lg: '3rem' } }}
              >
                {statistics.pending}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1, fontSize: { xs: '0.75rem', md: '0.875rem' } }}
              >
                Awaiting processing
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: (theme) =>
                `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.2)} 0%, ${alpha(
                  theme.palette.success.dark,
                  0.1
                )} 100%)`,
              border: (theme) => `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              transition: 'all 0.3s',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
              },
            }}
          >
            <CardContent sx={{ p: { xs: 2, md: 2.5, lg: 3 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <CheckCircleIcon
                  sx={{ mr: 1, color: 'success.main', fontSize: { xs: 24, md: 28 } }}
                />
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }}
                >
                  Completed
                </Typography>
              </Box>
              <Typography
                variant="h3"
                sx={{ fontWeight: 700, fontSize: { xs: '2rem', md: '2.5rem', lg: '3rem' } }}
              >
                {statistics.completed}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1, fontSize: { xs: '0.75rem', md: '0.875rem' } }}
              >
                {statistics.successRate}% success rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: (theme) =>
                `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.2)} 0%, ${alpha(
                  theme.palette.error.dark,
                  0.1
                )} 100%)`,
              border: (theme) => `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              transition: 'all 0.3s',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
              },
            }}
          >
            <CardContent sx={{ p: { xs: 2, md: 2.5, lg: 3 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <ErrorIcon sx={{ mr: 1, color: 'error.main', fontSize: { xs: 24, md: 28 } }} />
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }}
                >
                  Failed Jobs
                </Typography>
              </Box>
              <Typography
                variant="h3"
                sx={{ fontWeight: 700, fontSize: { xs: '2rem', md: '2.5rem', lg: '3rem' } }}
              >
                {statistics.failed}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1, fontSize: { xs: '0.75rem', md: '0.875rem' } }}
              >
                {statistics.failureRate}% failure rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Jobs Table */}
      <Paper
        sx={{
          width: '100%',
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          p: 3,
        }}
      >
        {loading ? (
          <JobsTableSkeleton rows={5} showUserEmail={false} />
        ) : (
          <JobsTable jobs={jobs} loading={loading} showUserEmail={false} />
        )}
      </Paper>
    </Box>
  );
}
