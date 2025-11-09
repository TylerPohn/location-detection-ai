import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  alpha,
  keyframes,
  useTheme,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { Security, Speed, Cloud } from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/types/routes';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
`;

export function LoginPage() {
  const { signIn, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const theme = useTheme();

  const from = (location.state as any)?.from?.pathname || ROUTES.UPLOAD;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      await signIn();
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box
        sx={{
          minHeight: '85vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 6,
            width: '100%',
            maxWidth: 1200,
          }}
        >
          {/* Left Side - Branding */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 4,
              animation: `${fadeIn} 0.8s ease-out`,
            }}
          >
            <Box>
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 800,
                  mb: 2,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Location Detection AI
              </Typography>
              <Typography variant="h5" color="text.secondary" sx={{ mb: 4 }}>
                Transform architectural blueprints into intelligent room detection with AI-powered analysis
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    animation: `${float} 3s ease-in-out infinite`,
                  }}
                >
                  <Speed sx={{ fontSize: 32, color: theme.palette.primary.main }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Lightning Fast
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Process blueprints in seconds with our optimized AI pipeline
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.secondary.main, 0.1),
                    animation: `${float} 3s ease-in-out infinite 0.3s`,
                  }}
                >
                  <Security sx={{ fontSize: 32, color: theme.palette.secondary.main }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Secure & Private
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Your data is encrypted and protected with enterprise-grade security
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.success.main, 0.1),
                    animation: `${float} 3s ease-in-out infinite 0.6s`,
                  }}
                >
                  <Cloud sx={{ fontSize: 32, color: theme.palette.success.main }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Cloud-Powered
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Access your results anywhere with cloud-based storage and processing
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Right Side - Login Form */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Paper
              elevation={0}
              sx={{
                p: 5,
                width: '100%',
                maxWidth: 500,
                background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.paper, 0.85)} 100%)`,
                backdropFilter: 'blur(20px)',
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.15)}`,
                borderRadius: 4,
                animation: `${fadeIn} 0.8s ease-out 0.2s both`,
              }}
            >
              <Typography
                variant="h4"
                component="h1"
                gutterBottom
                align="center"
                sx={{ fontWeight: 700, mb: 1 }}
              >
                Welcome Back
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                align="center"
                sx={{ mb: 4 }}
              >
                Sign in to access the application
              </Typography>

              {error && (
                <Alert
                  severity="error"
                  sx={{
                    mb: 3,
                    border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
                    boxShadow: `0 4px 12px ${alpha(theme.palette.error.main, 0.2)}`,
                  }}
                >
                  {error}
                </Alert>
              )}

              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={loading || authLoading ? null : <GoogleIcon />}
                onClick={handleGoogleSignIn}
                disabled={loading || authLoading}
                sx={{
                  py: 1.8,
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
                {loading || authLoading ? (
                  <CircularProgress size={24} sx={{ color: 'white' }} />
                ) : (
                  'Sign in with Google'
                )}
              </Button>

              <Typography
                variant="caption"
                color="text.secondary"
                align="center"
                sx={{ display: 'block', mt: 3 }}
              >
                By signing in, you agree to our Terms of Service and Privacy Policy
              </Typography>
            </Paper>
          </Box>
        </Box>
      </Box>
    </Container>
  );
}
