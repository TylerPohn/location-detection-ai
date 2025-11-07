// Home Page Component
import { Container, Typography, Box, Button, Card, CardContent } from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/types/routes';

export function HomePage() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md">
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h1" gutterBottom>
          Location Detection AI
        </Typography>
        <Typography variant="h5" color="text.secondary" paragraph>
          Upload architectural blueprints and let AI detect room boundaries automatically
        </Typography>
        <Button
          variant="contained"
          size="large"
          startIcon={<UploadIcon />}
          onClick={() => navigate(ROUTES.UPLOAD)}
          sx={{ mt: 4 }}
        >
          Upload Blueprint
        </Button>
      </Box>

      <Box sx={{ mt: 8 }}>
        <Typography variant="h4" gutterBottom align="center">
          How It Works
        </Typography>
        <Box sx={{ display: 'grid', gap: 3, mt: 4, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                1. Upload
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Upload your architectural blueprint in PNG, JPEG, or PDF format
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                2. Process
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Our AI analyzes the blueprint to detect room boundaries and labels
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                3. Results
              </Typography>
              <Typography variant="body2" color="text.secondary">
                View detected rooms with bounding boxes and confidence scores
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Container>
  );
}
