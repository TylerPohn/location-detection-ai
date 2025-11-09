// Upload Progress Component with Stepper
import { Box, Card, CardContent, Typography, LinearProgress, Stepper, Step, StepLabel, alpha, keyframes, useTheme } from '@mui/material';
import { CheckCircle, CloudUpload, AutoAwesome, CheckCircleOutline, Rocket } from '@mui/icons-material';

// Animated keyframes
const rotate = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const scaleIn = keyframes`
  from { transform: scale(0); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
`;

const slideUp = keyframes`
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const glow = keyframes`
  0%, 100% { filter: drop-shadow(0 0 8px currentColor); }
  50% { filter: drop-shadow(0 0 20px currentColor); }
`;

const sparkle = keyframes`
  0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
  50% { transform: scale(1.2) rotate(180deg); opacity: 0.8; }
`;

interface UploadProgressProps {
  stage: 'requesting' | 'uploading' | 'processing' | 'success';
  progress: number;
}

const STEPS = [
  { key: 'requesting', label: 'Preparing Upload', icon: Rocket },
  { key: 'uploading', label: 'Uploading Blueprint', icon: CloudUpload },
  { key: 'processing', label: 'Detecting Rooms', icon: AutoAwesome },
  { key: 'success', label: 'Complete', icon: CheckCircle },
];

export function UploadProgress({ stage, progress }: UploadProgressProps) {
  const activeStepIndex = STEPS.findIndex((step) => step.key === stage);
  const theme = useTheme();

  return (
    <Card
      sx={{
        background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.paper, 0.85)} 100%)`,
        backdropFilter: 'blur(20px)',
        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.15)}`,
        overflow: 'hidden',
        position: 'relative',
        animation: `${slideUp} 0.5s ease-out`,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          boxShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.6)}`,
        }}
      />

      <CardContent sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              mb: 1,
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Processing Your Blueprint
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {stage === 'requesting' && 'Getting everything ready for upload...'}
            {stage === 'uploading' && 'Transferring your blueprint to the cloud...'}
            {stage === 'processing' && 'AI is analyzing room boundaries...'}
            {stage === 'success' && 'All done! Preparing your results...'}
          </Typography>
        </Box>

        <Stepper
          activeStep={activeStepIndex}
          sx={{
            mt: 4,
            mb: 4,
            '& .MuiStepLabel-root .Mui-completed': {
              color: theme.palette.success.main,
            },
            '& .MuiStepLabel-label.Mui-completed': {
              fontWeight: 600,
            },
            '& .MuiStepLabel-root .Mui-active': {
              color: theme.palette.primary.main,
              animation: `${glow} 2s ease-in-out infinite`,
            },
          }}
        >
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isCompleted = activeStepIndex > index;
            const isActive = activeStepIndex === index;

            return (
              <Step key={step.key}>
                <StepLabel
                  icon={
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isCompleted
                          ? `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`
                          : isActive
                          ? `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
                          : alpha(theme.palette.text.secondary, 0.1),
                        border: isActive ? `2px solid ${theme.palette.primary.main}` : 'none',
                        boxShadow: isActive
                          ? `0 0 20px ${alpha(theme.palette.primary.main, 0.5)}`
                          : isCompleted
                          ? `0 0 12px ${alpha(theme.palette.success.main, 0.3)}`
                          : 'none',
                        transition: 'all 0.4s',
                        animation: isCompleted
                          ? `${scaleIn} 0.5s ease-out`
                          : isActive
                          ? `${rotate} 2s linear infinite`
                          : 'none',
                      }}
                    >
                      {isCompleted ? (
                        <CheckCircle sx={{ color: 'white', fontSize: 28 }} />
                      ) : (
                        <StepIcon
                          sx={{
                            color: isActive ? 'white' : theme.palette.text.secondary,
                            fontSize: 28,
                          }}
                        />
                      )}
                    </Box>
                  }
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: isActive ? 600 : 400,
                      color: isCompleted
                        ? theme.palette.success.main
                        : isActive
                        ? theme.palette.primary.main
                        : theme.palette.text.secondary,
                    }}
                  >
                    {step.label}
                  </Typography>
                </StepLabel>
              </Step>
            );
          })}
        </Stepper>

        {stage === 'uploading' && (
          <Box sx={{ mt: 4, animation: `${slideUp} 0.3s ease-out` }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                Uploading...
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  fontWeight: 700,
                  color: theme.palette.primary.main,
                }}
              >
                {progress}%
              </Typography>
            </Box>
            <Box sx={{ position: 'relative' }}>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 6,
                    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    boxShadow: `0 0 15px ${alpha(theme.palette.primary.main, 0.6)}`,
                    transition: 'transform 0.4s ease-in-out',
                  },
                }}
              />
            </Box>
          </Box>
        )}

        {stage === 'processing' && (
          <Box sx={{ mt: 4, animation: `${slideUp} 0.3s ease-out` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              <AutoAwesome
                sx={{
                  fontSize: 32,
                  color: theme.palette.primary.main,
                  animation: `${sparkle} 2s ease-in-out infinite`,
                  mr: 1,
                }}
              />
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                AI is analyzing your blueprint...
              </Typography>
            </Box>
            <LinearProgress
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main}, ${theme.palette.primary.main})`,
                  backgroundSize: '200% 100%',
                  animation: 'gradient 2s ease infinite',
                  '@keyframes gradient': {
                    '0%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                    '100%': { backgroundPosition: '0% 50%' },
                  },
                  boxShadow: `0 0 15px ${alpha(theme.palette.primary.main, 0.6)}`,
                },
              }}
            />
          </Box>
        )}

        {stage === 'success' && (
          <Box
            sx={{
              mt: 4,
              textAlign: 'center',
              animation: `${scaleIn} 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)`,
            }}
          >
            <Box
              sx={{
                position: 'relative',
                display: 'inline-block',
              }}
            >
              <CheckCircle
                sx={{
                  fontSize: 80,
                  color: theme.palette.success.main,
                  filter: `drop-shadow(0 0 20px ${alpha(theme.palette.success.main, 0.6)})`,
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  border: `3px solid ${theme.palette.success.main}`,
                  animation: `${scaleIn} 0.8s ease-out`,
                  opacity: 0.3,
                }}
              />
            </Box>
            <Typography
              variant="h5"
              sx={{
                mt: 2,
                fontWeight: 700,
                color: theme.palette.success.main,
              }}
            >
              Processing Complete!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
              Redirecting to your results...
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
