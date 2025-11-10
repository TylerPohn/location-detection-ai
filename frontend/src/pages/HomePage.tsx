// Home Page Component
import { useState, useEffect } from 'react';
import { Container, Typography, Box, Button, Card, CardContent, alpha, keyframes, useTheme, Grid, Chip, CircularProgress } from '@mui/material';
import { CloudUpload as UploadIcon, AutoAwesome, Speed, Visibility, Work as WorkIcon, ArrowForward } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/types/routes';
import { useAuth } from '@/contexts/AuthContext';
import { getUserJobs } from '@/services/api';
import type { DetectionResult } from '@/types/api';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-15px); }
`;

export function HomePage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { isAuthenticated } = useAuth();
  const [recentJobs, setRecentJobs] = useState<DetectionResult[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  useEffect(() => {
    const fetchRecentJobs = async () => {
      if (!isAuthenticated) return;

      setLoadingJobs(true);
      try {
        const jobs = await getUserJobs();
        // Get the 5 most recent jobs
        setRecentJobs(jobs.slice(0, 5));
      } catch (error) {
        console.error('Failed to fetch recent jobs:', error);
      } finally {
        setLoadingJobs(false);
      }
    };

    fetchRecentJobs();
  }, [isAuthenticated]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <Container maxWidth="xl">
      {/* Hero Section */}
      <Box
        sx={{
          textAlign: 'center',
          py: { xs: 8, md: 12 },
          animation: `${fadeIn} 0.8s ease-out`,
        }}
      >
        <Typography
          variant="h1"
          sx={{
            fontWeight: 800,
            fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4.5rem' },
            mb: 3,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Location Detection AI
        </Typography>
        <Typography
          variant="h4"
          color="text.secondary"
          sx={{
            maxWidth: 800,
            mx: 'auto',
            mb: 5,
            fontWeight: 400,
            fontSize: { xs: '1.25rem', md: '1.75rem' },
          }}
        >
          Upload architectural blueprints and let AI detect room boundaries automatically
        </Typography>
        <Button
          variant="contained"
          size="large"
          startIcon={<UploadIcon />}
          onClick={() => navigate(ROUTES.UPLOAD)}
          sx={{
            px: 5,
            py: 2,
            fontSize: '1.2rem',
            fontWeight: 600,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.4)}`,
            '&:hover': {
              background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
              transform: 'translateY(-3px)',
              boxShadow: `0 12px 32px ${alpha(theme.palette.primary.main, 0.5)}`,
            },
            transition: 'all 0.3s',
          }}
        >
          Get Started
        </Button>
      </Box>

      {/* Recent Jobs Section - Only visible when authenticated */}
      {isAuthenticated && (
        <Box sx={{ py: 6, animation: `${fadeIn} 0.8s ease-out` }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 4,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <WorkIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                My Recent Jobs
              </Typography>
            </Box>
            {recentJobs.length > 0 && (
              <Button
                variant="outlined"
                endIcon={<ArrowForward />}
                onClick={() => navigate(ROUTES.MY_JOBS)}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: 2,
                }}
              >
                View All Jobs
              </Button>
            )}
          </Box>

          {loadingJobs ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : recentJobs.length === 0 ? (
            <Card
              sx={{
                p: 6,
                textAlign: 'center',
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              }}
            >
              <Typography variant="h5" color="text.secondary" gutterBottom>
                No jobs yet
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Upload your first blueprint to get started
              </Typography>
              <Button
                variant="contained"
                startIcon={<UploadIcon />}
                onClick={() => navigate(ROUTES.UPLOAD)}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                Upload Blueprint
              </Button>
            </Card>
          ) : (
            <Grid container spacing={3}>
              {recentJobs.map((job, index) => (
                <Grid item xs={12} sm={6} md={4} key={job.jobId}>
                  <Card
                    sx={{
                      height: '100%',
                      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                      transition: 'all 0.3s',
                      animation: `${fadeIn} 0.6s ease-out ${index * 0.1}s both`,
                      cursor: 'pointer',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: `0 12px 32px ${alpha(theme.palette.primary.main, 0.2)}`,
                        borderColor: theme.palette.primary.main,
                      },
                    }}
                    onClick={() => navigate(ROUTES.RESULTS.replace(':jobId', job.jobId))}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            fontFamily: 'monospace',
                            color: 'text.secondary',
                            fontSize: '0.75rem',
                          }}
                        >
                          {job.jobId.substring(0, 12)}...
                        </Typography>
                        <Chip
                          label={job.status}
                          size="small"
                          color={
                            job.status === 'completed'
                              ? 'success'
                              : job.status === 'failed'
                              ? 'error'
                              : job.status === 'processing'
                              ? 'warning'
                              : 'default'
                          }
                          sx={{
                            textTransform: 'uppercase',
                            fontWeight: 600,
                            fontSize: '0.7rem',
                          }}
                        />
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                        Blueprint Analysis
                      </Typography>
                      {job.roomCount !== undefined && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {job.roomCount} rooms detected
                        </Typography>
                      )}
                      {job.progress !== undefined && job.status === 'processing' && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="caption" color="text.secondary">
                            Processing: {job.progress}%
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* How It Works Section */}
      <Box sx={{ py: 8 }}>
        <Typography
          variant="h3"
          gutterBottom
          align="center"
          sx={{
            fontWeight: 700,
            mb: 6,
          }}
        >
          How It Works
        </Typography>

        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Card
              sx={{
                height: '100%',
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                transition: 'all 0.3s',
                animation: `${fadeIn} 0.8s ease-out 0.2s both`,
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: `0 12px 32px ${alpha(theme.palette.primary.main, 0.25)}`,
                },
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box
                  sx={{
                    width: 70,
                    height: 70,
                    borderRadius: '50%',
                    bgcolor: alpha(theme.palette.primary.main, 0.15),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 3,
                    animation: `${float} 3s ease-in-out infinite`,
                  }}
                >
                  <UploadIcon sx={{ fontSize: 36, color: theme.palette.primary.main }} />
                </Box>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
                  1. Upload
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                  Upload your architectural blueprint in PNG, JPEG, or PDF format. Drag and drop or click to browse your files.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card
              sx={{
                height: '100%',
                background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.1)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
                border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
                transition: 'all 0.3s',
                animation: `${fadeIn} 0.8s ease-out 0.4s both`,
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: `0 12px 32px ${alpha(theme.palette.secondary.main, 0.25)}`,
                },
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box
                  sx={{
                    width: 70,
                    height: 70,
                    borderRadius: '50%',
                    bgcolor: alpha(theme.palette.secondary.main, 0.15),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 3,
                    animation: `${float} 3s ease-in-out infinite 0.3s`,
                  }}
                >
                  <AutoAwesome sx={{ fontSize: 36, color: theme.palette.secondary.main }} />
                </Box>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
                  2. Process
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                  Our AI analyzes the blueprint to detect room boundaries and labels with machine learning precision.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card
              sx={{
                height: '100%',
                background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
                border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                transition: 'all 0.3s',
                animation: `${fadeIn} 0.8s ease-out 0.6s both`,
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: `0 12px 32px ${alpha(theme.palette.success.main, 0.25)}`,
                },
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box
                  sx={{
                    width: 70,
                    height: 70,
                    borderRadius: '50%',
                    bgcolor: alpha(theme.palette.success.main, 0.15),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 3,
                    animation: `${float} 3s ease-in-out infinite 0.6s`,
                  }}
                >
                  <Visibility sx={{ fontSize: 36, color: theme.palette.success.main }} />
                </Box>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
                  3. Results
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                  View detected rooms with bounding boxes and confidence scores. Export results as JSON or CSV.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* CTA Section */}
      <Box
        sx={{
          py: 10,
          textAlign: 'center',
          animation: `${fadeIn} 0.8s ease-out 0.8s both`,
        }}
      >
        <Box
          sx={{
            p: 6,
            borderRadius: 4,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.15)}`,
          }}
        >
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
            Ready to get started?
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
            Transform your blueprints into actionable insights with AI-powered room detection
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<UploadIcon />}
            onClick={() => navigate(ROUTES.UPLOAD)}
            sx={{
              px: 5,
              py: 2,
              fontSize: '1.1rem',
              fontWeight: 600,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.4)}`,
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                transform: 'translateY(-3px)',
                boxShadow: `0 12px 32px ${alpha(theme.palette.primary.main, 0.5)}`,
              },
              transition: 'all 0.3s',
            }}
          >
            Upload Your First Blueprint
          </Button>
        </Box>
      </Box>
    </Container>
  );
}
