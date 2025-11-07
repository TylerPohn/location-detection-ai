// Upload Progress Component with Stepper
import { Box, Card, CardContent, Typography, LinearProgress, Stepper, Step, StepLabel } from '@mui/material';
import { CheckCircle, CloudUpload, AutoAwesome, CheckCircleOutline } from '@mui/icons-material';

interface UploadProgressProps {
  stage: 'requesting' | 'uploading' | 'processing' | 'success';
  progress: number;
}

const STEPS = [
  { key: 'requesting', label: 'Preparing Upload', icon: CloudUpload },
  { key: 'uploading', label: 'Uploading Blueprint', icon: CloudUpload },
  { key: 'processing', label: 'Detecting Rooms', icon: AutoAwesome },
  { key: 'success', label: 'Complete', icon: CheckCircle },
];

export function UploadProgress({ stage, progress }: UploadProgressProps) {
  const activeStepIndex = STEPS.findIndex((step) => step.key === stage);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Processing Your Blueprint
        </Typography>

        <Stepper activeStep={activeStepIndex} sx={{ mt: 3, mb: 3 }}>
          {STEPS.map((step) => (
            <Step key={step.key}>
              <StepLabel
                StepIconComponent={
                  activeStepIndex > STEPS.findIndex((s) => s.key === step.key)
                    ? CheckCircleOutline
                    : step.icon
                }
              >
                {step.label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        {stage === 'uploading' && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {progress}% uploaded
            </Typography>
            <LinearProgress variant="determinate" value={progress} />
          </Box>
        )}

        {stage === 'processing' && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              AI is analyzing your blueprint...
            </Typography>
            <LinearProgress />
          </Box>
        )}

        {stage === 'success' && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <CheckCircle color="success" sx={{ fontSize: 48 }} />
            <Typography variant="body1" sx={{ mt: 1 }}>
              Processing complete! Redirecting...
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
