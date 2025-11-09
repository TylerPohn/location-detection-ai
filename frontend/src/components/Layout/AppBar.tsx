import {
  AppBar as MuiAppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  alpha,
  useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Home as HomeIcon, Login as LoginIcon, CloudUpload } from '@mui/icons-material';
import { ROUTES } from '@/types/routes';
import { useAuth } from '@/contexts/AuthContext';
import { UserMenu } from './UserMenu';

export function AppBar() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const theme = useTheme();

  return (
    <MuiAppBar
      position="static"
      elevation={0}
      sx={{
        background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 50%, ${theme.palette.secondary.dark} 100%)`,
        borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
      }}
    >
      <Toolbar sx={{ minHeight: { xs: 64, sm: 72, md: 80 }, px: { xs: 2, sm: 3, md: 4, lg: 6, xl: 8 }, maxWidth: '100%' }}>
        <IconButton
          edge="start"
          color="inherit"
          onClick={() => navigate(ROUTES.HOME)}
          sx={{
            mr: 2,
            bgcolor: alpha(theme.palette.common.white, 0.1),
            '&:hover': {
              bgcolor: alpha(theme.palette.common.white, 0.2),
              transform: 'scale(1.05)',
            },
            transition: 'all 0.2s',
          }}
        >
          <HomeIcon />
        </IconButton>

        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <Typography
            variant="h5"
            component="div"
            sx={{
              fontWeight: 700,
              fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem', lg: '2rem' },
              letterSpacing: '-0.5px',
              background: `linear-gradient(45deg, ${theme.palette.common.white} 30%, ${alpha(theme.palette.common.white, 0.7)} 90%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Location Detection AI
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: { xs: 1, sm: 1.5, md: 2 }, alignItems: 'center' }}>
          {isAuthenticated && (
            <Button
              color="inherit"
              startIcon={<CloudUpload />}
              onClick={() => navigate(ROUTES.UPLOAD)}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: { xs: '0.875rem', md: '1rem' },
                px: { xs: 2, md: 3 },
                py: { xs: 1, md: 1.25 },
                borderRadius: 2,
                bgcolor: alpha(theme.palette.common.white, 0.1),
                backdropFilter: 'blur(10px)',
                boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.2)}`,
                '&:hover': {
                  bgcolor: alpha(theme.palette.common.white, 0.2),
                  transform: 'translateY(-2px)',
                  boxShadow: `0 6px 16px ${alpha(theme.palette.common.black, 0.3)}`,
                },
                transition: 'all 0.2s',
              }}
            >
              Upload
            </Button>
          )}
          {isAuthenticated ? (
            <UserMenu />
          ) : (
            <Button
              color="inherit"
              startIcon={<LoginIcon />}
              onClick={() => navigate(ROUTES.LOGIN)}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: { xs: '0.875rem', md: '1rem' },
                px: { xs: 2, md: 3 },
                py: { xs: 1, md: 1.25 },
                borderRadius: 2,
                bgcolor: alpha(theme.palette.common.white, 0.15),
                border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
                backdropFilter: 'blur(10px)',
                boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.2)}`,
                '&:hover': {
                  bgcolor: alpha(theme.palette.common.white, 0.25),
                  transform: 'translateY(-2px)',
                  boxShadow: `0 6px 16px ${alpha(theme.palette.common.black, 0.3)}`,
                },
                transition: 'all 0.2s',
              }}
            >
              Sign In
            </Button>
          )}
        </Box>
      </Toolbar>
    </MuiAppBar>
  );
}
