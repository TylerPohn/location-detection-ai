import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardActionArea,
  CardContent,
  Grid,
  CircularProgress,
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useAuth } from '@/contexts/AuthContext';
import { createUserProfile } from '@/services/firestore';
import { ROUTES } from '@/types/routes';
import type { UserRole } from '@/types/auth';

export function RoleSelectionPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const handleRoleSelect = async (role: UserRole) => {
    if (!user) return;

    setLoading(true);
    setSelectedRole(role);

    try {
      await createUserProfile(
        user.uid,
        user.email || '',
        user.displayName || null,
        user.photoURL || null,
        role
      );

      // Redirect to upload page after profile creation
      navigate(ROUTES.UPLOAD);
    } catch (error) {
      console.error('Failed to create user profile:', error);
      setLoading(false);
      setSelectedRole(null);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 8 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center">
          Welcome to Location Detection AI
        </Typography>
        <Typography variant="h6" color="text.secondary" align="center" sx={{ mb: 6 }}>
          Please select your role to continue
        </Typography>

        <Grid container spacing={4}>
          {/* Student Card */}
          <Grid item xs={12} md={6}>
            <Card
              elevation={3}
              sx={{
                height: '100%',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
              }}
            >
              <CardActionArea
                onClick={() => handleRoleSelect('student')}
                disabled={loading}
                sx={{ height: '100%' }}
              >
                <CardContent sx={{ textAlign: 'center', py: 6 }}>
                  {loading && selectedRole === 'student' ? (
                    <CircularProgress size={80} sx={{ mb: 2 }} />
                  ) : (
                    <SchoolIcon
                      sx={{
                        fontSize: 80,
                        color: 'primary.main',
                        mb: 2,
                      }}
                    />
                  )}
                  <Typography variant="h4" component="h2" gutterBottom>
                    Student
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Upload and analyze floor plans
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>

          {/* Admin Card */}
          <Grid item xs={12} md={6}>
            <Card
              elevation={3}
              sx={{
                height: '100%',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
              }}
            >
              <CardActionArea
                onClick={() => handleRoleSelect('admin')}
                disabled={loading}
                sx={{ height: '100%' }}
              >
                <CardContent sx={{ textAlign: 'center', py: 6 }}>
                  {loading && selectedRole === 'admin' ? (
                    <CircularProgress size={80} sx={{ mb: 2 }} />
                  ) : (
                    <AdminPanelSettingsIcon
                      sx={{
                        fontSize: 80,
                        color: 'secondary.main',
                        mb: 2,
                      }}
                    />
                  )}
                  <Typography variant="h4" component="h2" gutterBottom>
                    Admin
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Manage users and view all jobs
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}
