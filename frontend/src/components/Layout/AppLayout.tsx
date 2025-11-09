import { ReactNode } from 'react';
import { Box, CssBaseline, ThemeProvider } from '@mui/material';
import { theme } from '@/theme/theme';
import { AppBar } from './AppBar';
import { Footer } from './Footer';
import { DemoBanner } from '@/demo/DemoBanner';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        {isDemoMode && <DemoBanner />}
        <AppBar />
        <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
          {children}
        </Box>
        <Footer />
      </Box>
    </ThemeProvider>
  );
}
