import { Alert, AlertTitle, Box, Chip, IconButton, Collapse } from '@mui/material';
import { Info, Close } from '@mui/icons-material';
import { useState } from 'react';

/**
 * DemoBanner Component
 *
 * Displays a prominent banner at the top of the application when running in demo mode.
 * Indicates that the app is using mock data and no backend connection is required.
 */
export function DemoBanner() {
  const [open, setOpen] = useState(true);

  if (!open) {
    return null;
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Collapse in={open}>
        <Alert
          severity="info"
          icon={<Info />}
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={() => setOpen(false)}
            >
              <Close fontSize="inherit" />
            </IconButton>
          }
          sx={{
            mb: 0,
            borderRadius: 0,
            '& .MuiAlert-message': {
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              flexWrap: 'wrap',
            },
          }}
        >
          <AlertTitle sx={{ mb: 0, fontWeight: 600 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              DEMO MODE
              <Chip
                label="No Backend Required"
                size="small"
                color="info"
                variant="outlined"
              />
            </Box>
          </AlertTitle>
          <Box sx={{ fontSize: '0.875rem', mt: 0.5 }}>
            This application is running with mock data. All API requests are intercepted and handled by Mock Service Worker (MSW).
            No backend server connection is required.
          </Box>
        </Alert>
      </Collapse>
    </Box>
  );
}
