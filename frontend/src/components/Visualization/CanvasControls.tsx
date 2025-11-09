// Canvas zoom and pan controls
import { Box, IconButton, ButtonGroup, Tooltip, Typography } from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  ZoomOutMap,
  CenterFocusStrong,
} from '@mui/icons-material';

interface CanvasControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitToScreen: () => void;
  currentZoom: number;
}

export function CanvasControls({
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitToScreen,
  currentZoom,
}: CanvasControlsProps) {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
        backgroundColor: 'background.paper',
        borderRadius: 1,
        boxShadow: 2,
      }}
    >
      <ButtonGroup orientation="vertical" variant="text">
        <Tooltip title="Zoom In" placement="left">
          <IconButton onClick={onZoomIn} disabled={currentZoom >= 3}>
            <ZoomIn />
          </IconButton>
        </Tooltip>

        <Tooltip title="Zoom Out" placement="left">
          <IconButton onClick={onZoomOut} disabled={currentZoom <= 0.5}>
            <ZoomOut />
          </IconButton>
        </Tooltip>

        <Tooltip title="Reset Zoom" placement="left">
          <IconButton onClick={onResetZoom}>
            <CenterFocusStrong />
          </IconButton>
        </Tooltip>

        <Tooltip title="Fit to Screen" placement="left">
          <IconButton onClick={onFitToScreen}>
            <ZoomOutMap />
          </IconButton>
        </Tooltip>
      </ButtonGroup>

      <Box sx={{ p: 1, textAlign: 'center', borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary">
          {Math.round(currentZoom * 100)}%
        </Typography>
      </Box>
    </Box>
  );
}
