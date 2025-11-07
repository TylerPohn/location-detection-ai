// Results Page Placeholder
import { Container, Typography, Box, Button, CircularProgress } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '@/types/routes';

export function ResultsPage() {
  const navigate = useNavigate();
  const { jobId } = useParams<{ jobId: string }>();

  return (
    <Container maxWidth="md">
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(ROUTES.HOME)}
          sx={{ mb: 2 }}
        >
          Back to Home
        </Button>
        <Typography variant="h2" gutterBottom>
          Detection Results
        </Typography>
      </Box>

      <Box sx={{ textAlign: 'center', py: 8 }}>
        <CircularProgress size={60} />
        <Typography variant="body1" sx={{ mt: 3 }}>
          Loading results for job: {jobId}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          This page will be fully implemented in PR-8
        </Typography>
      </Box>
    </Container>
  );
}
