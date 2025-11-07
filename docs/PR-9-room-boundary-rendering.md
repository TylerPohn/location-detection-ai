# PR-9: Room Boundary Rendering and Visualization

## Overview
Implement canvas-based visualization to render detected room boundaries with lines and polygons overlaid on the blueprint image.

## Dependencies
**Requires:**
- PR-6 (React Frontend Foundation)
- PR-8 (API Integration and State Management)

## Objectives
- Implement canvas rendering for blueprint images
- Draw room boundaries as lines and polygons
- Add interactive features (zoom, pan, room selection)
- Display room metadata (area, perimeter, ID)
- Create color-coded visualization
- Add export functionality for results

## Detailed Steps

### 1. Install Visualization Dependencies
**Estimated Time:** 10 minutes

```bash
cd frontend

# Install canvas library
npm install react-konva konva

# Install types
npm install --save-dev @types/react-konva
```

**Verification:** Run `npm install` and verify packages are installed.

### 2. Create Canvas Utility Functions
**Estimated Time:** 25 minutes

```typescript
// frontend/src/utils/canvas.ts
import type { Room, Point } from '@/types/api';

export interface CanvasConfig {
  width: number;
  height: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

export function calculateCanvasSize(
  imageWidth: number,
  imageHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number; scale: number } {
  const scaleX = maxWidth / imageWidth;
  const scaleY = maxHeight / imageHeight;
  const scale = Math.min(scaleX, scaleY, 1); // Don't scale up

  return {
    width: imageWidth * scale,
    height: imageHeight * scale,
    scale,
  };
}

export function pointsToKonvaPoints(points: Point[]): number[] {
  // Convert [[x1, y1], [x2, y2]] to [x1, y1, x2, y2]
  return points.flatMap((point) => point);
}

export function generateRoomColor(index: number): string {
  const colors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#FFA07A', // Light Salmon
    '#98D8C8', // Mint
    '#F7DC6F', // Yellow
    '#BB8FCE', // Purple
    '#85C1E2', // Sky Blue
    '#F8B88B', // Peach
    '#A2D9CE', // Aqua
  ];
  return colors[index % colors.length];
}

export function calculateRoomCenter(polygon: Point[]): Point {
  const sumX = polygon.reduce((sum, [x]) => sum + x, 0);
  const sumY = polygon.reduce((sum, [, y]) => sum + y, 0);
  return [sumX / polygon.length, sumY / polygon.length];
}

export function formatArea(area: number): string {
  return `${area.toFixed(0)} px²`;
}

export function formatPerimeter(perimeter: number): string {
  return `${perimeter.toFixed(0)} px`;
}
```

**Verification:** Import utils and verify TypeScript types.

### 3. Create Blueprint Canvas Component
**Estimated Time:** 50 minutes

```tsx
// frontend/src/components/Visualization/BlueprintCanvas.tsx
import { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Line, Text, Circle } from 'react-konva';
import { Box, Paper } from '@mui/material';
import type { Room } from '@/types/api';
import {
  calculateCanvasSize,
  pointsToKonvaPoints,
  generateRoomColor,
  calculateRoomCenter,
} from '@/utils/canvas';

interface BlueprintCanvasProps {
  imageUrl: string;
  rooms: Room[];
  onRoomSelect?: (room: Room | null) => void;
  selectedRoomId?: string | null;
}

export function BlueprintCanvas({
  imageUrl,
  rooms,
  onRoomSelect,
  selectedRoomId,
}: BlueprintCanvasProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600, scale: 1 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Load image
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      setImage(img);

      // Calculate canvas size based on container
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const containerHeight = window.innerHeight * 0.7; // 70vh

        const dims = calculateCanvasSize(
          img.width,
          img.height,
          containerWidth - 32, // Account for padding
          containerHeight
        );

        setDimensions(dims);
      }
    };
  }, [imageUrl]);

  const handleRoomClick = (room: Room) => {
    if (onRoomSelect) {
      onRoomSelect(selectedRoomId === room.id ? null : room);
    }
  };

  return (
    <Paper ref={containerRef} sx={{ p: 2, overflow: 'auto' }}>
      <Stage width={dimensions.width} height={dimensions.height}>
        <Layer>
          {/* Blueprint image */}
          {image && (
            <KonvaImage
              image={image}
              width={dimensions.width}
              height={dimensions.height}
            />
          )}

          {/* Room boundaries */}
          {rooms.map((room, index) => {
            const color = generateRoomColor(index);
            const isSelected = selectedRoomId === room.id;
            const points = pointsToKonvaPoints(room.polygon);

            return (
              <React.Fragment key={room.id}>
                {/* Polygon fill */}
                <Line
                  points={points}
                  closed
                  fill={color}
                  opacity={isSelected ? 0.4 : 0.2}
                  stroke={color}
                  strokeWidth={isSelected ? 3 : 2}
                  onClick={() => handleRoomClick(room)}
                  onTap={() => handleRoomClick(room)}
                  listening={true}
                  perfectDrawEnabled={false}
                />

                {/* Room label */}
                {(() => {
                  const center = calculateRoomCenter(room.polygon);
                  const [x, y] = center.map((coord, i) =>
                    coord * dimensions.scale
                  ) as [number, number];

                  return (
                    <React.Fragment>
                      {/* Background circle for label */}
                      <Circle
                        x={x}
                        y={y}
                        radius={20}
                        fill="rgba(0, 0, 0, 0.7)"
                        onClick={() => handleRoomClick(room)}
                        onTap={() => handleRoomClick(room)}
                      />

                      {/* Room ID text */}
                      <Text
                        x={x}
                        y={y}
                        text={room.id.replace('room_', '')}
                        fontSize={14}
                        fill="white"
                        align="center"
                        verticalAlign="middle"
                        offsetX={10}
                        offsetY={7}
                        onClick={() => handleRoomClick(room)}
                        onTap={() => handleRoomClick(room)}
                      />
                    </React.Fragment>
                  );
                })()}
              </React.Fragment>
            );
          })}
        </Layer>
      </Stage>
    </Paper>
  );
}
```

**Verification:** Import component and test with sample data.

### 4. Create Room Details Panel
**Estimated Time:** 30 minutes

```tsx
// frontend/src/components/Visualization/RoomDetailsPanel.tsx
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
} from '@mui/material';
import {
  Square as SquareIcon,
  Timeline as PerimeterIcon,
  Label as LabelIcon,
} from '@mui/icons-material';
import type { Room } from '@/types/api';
import { formatArea, formatPerimeter, generateRoomColor } from '@/utils/canvas';

interface RoomDetailsPanelProps {
  room: Room;
  index: number;
}

export function RoomDetailsPanel({ room, index }: RoomDetailsPanelProps) {
  const color = generateRoomColor(index);

  return (
    <Card sx={{ borderLeft: 4, borderColor: color }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <LabelIcon />
          <Typography variant="h6">{room.id}</Typography>
          {room.name_hint && (
            <Chip label={room.name_hint} size="small" variant="outlined" />
          )}
        </Box>

        <List dense>
          <ListItem>
            <SquareIcon sx={{ mr: 2, color: 'text.secondary' }} fontSize="small" />
            <ListItemText
              primary="Area"
              secondary={formatArea(room.area)}
            />
          </ListItem>

          <ListItem>
            <PerimeterIcon sx={{ mr: 2, color: 'text.secondary' }} fontSize="small" />
            <ListItemText
              primary="Perimeter"
              secondary={formatPerimeter(room.perimeter)}
            />
          </ListItem>

          <Divider sx={{ my: 1 }} />

          <ListItem>
            <ListItemText
              primary="Vertices"
              secondary={`${room.polygon.length} points`}
            />
          </ListItem>

          <ListItem>
            <ListItemText
              primary="Lines"
              secondary={`${room.lines.length} segments`}
            />
          </ListItem>
        </List>

        {room.polygon.length <= 6 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Coordinates
            </Typography>
            <Box sx={{ mt: 0.5, maxHeight: 150, overflow: 'auto' }}>
              {room.polygon.map((point, idx) => (
                <Typography
                  key={idx}
                  variant="caption"
                  component="div"
                  sx={{ fontFamily: 'monospace' }}
                >
                  {idx + 1}: ({point[0].toFixed(0)}, {point[1].toFixed(0)})
                </Typography>
              ))}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
```

**Verification:** Test panel with different room data.

### 5. Create Room List Component
**Estimated Time:** 25 minutes

```tsx
// frontend/src/components/Visualization/RoomList.tsx
import {
  Box,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  Chip,
  Paper,
} from '@mui/material';
import type { Room } from '@/types/api';
import { generateRoomColor, formatArea } from '@/utils/canvas';

interface RoomListProps {
  rooms: Room[];
  selectedRoomId: string | null;
  onRoomSelect: (room: Room) => void;
}

export function RoomList({ rooms, selectedRoomId, onRoomSelect }: RoomListProps) {
  return (
    <Paper sx={{ maxHeight: 400, overflow: 'auto' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6">
          Detected Rooms ({rooms.length})
        </Typography>
      </Box>

      <List>
        {rooms.map((room, index) => {
          const color = generateRoomColor(index);
          const isSelected = selectedRoomId === room.id;

          return (
            <ListItemButton
              key={room.id}
              selected={isSelected}
              onClick={() => onRoomSelect(room)}
              sx={{
                borderLeft: 4,
                borderColor: isSelected ? color : 'transparent',
                '&:hover': {
                  borderColor: color,
                },
              }}
            >
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: color,
                  mr: 2,
                }}
              />

              <ListItemText
                primary={room.id}
                secondary={formatArea(room.area)}
              />

              {room.name_hint && (
                <Chip label={room.name_hint} size="small" variant="outlined" />
              )}
            </ListItemButton>
          );
        })}
      </List>
    </Paper>
  );
}
```

**Verification:** Test list with room selection.

### 6. Create Export Functionality
**Estimated Time:** 20 minutes

```typescript
// frontend/src/utils/export.ts
import type { Room } from '@/types/api';

export function exportRoomsAsJSON(rooms: Room[], jobId: string): void {
  const data = {
    jobId,
    exportDate: new Date().toISOString(),
    roomCount: rooms.length,
    rooms,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `location-detection-${jobId}.json`;
  link.click();

  URL.revokeObjectURL(url);
}

export function exportRoomsAsCSV(rooms: Room[]): void {
  const headers = ['ID', 'Area (px²)', 'Perimeter (px)', 'Vertices', 'Name Hint'];

  const rows = rooms.map((room) => [
    room.id,
    room.area.toFixed(2),
    room.perimeter.toFixed(2),
    room.polygon.length,
    room.name_hint || '',
  ]);

  const csv = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `rooms-export.csv`;
  link.click();

  URL.revokeObjectURL(url);
}
```

**Verification:** Test export functions.

### 7. Create Results Page Layout
**Estimated Time:** 35 minutes

```tsx
// frontend/src/pages/ResultsPage.tsx
import { useState } from 'react';
import {
  Container,
  Grid,
  Typography,
  Box,
  Button,
  ButtonGroup,
} from '@mui/material';
import {
  ArrowBack,
  Download as DownloadIcon,
  Description as JSONIcon,
  TableChart as CSVIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useJobStatus } from '@/hooks/useJobStatus';
import { JobStatus } from '@/components/Results/JobStatus';
import { BlueprintCanvas } from '@/components/Visualization/BlueprintCanvas';
import { RoomList } from '@/components/Visualization/RoomList';
import { RoomDetailsPanel } from '@/components/Visualization/RoomDetailsPanel';
import { SkeletonCard } from '@/components/Loading/SkeletonCard';
import { RetryError } from '@/components/Error/RetryError';
import { exportRoomsAsJSON, exportRoomsAsCSV } from '@/utils/export';
import { ROUTES } from '@/types/routes';
import type { Room } from '@/types/api';

export function ResultsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const { data, isLoading, error, refetch } = useJobStatus({
    jobId: jobId || '',
    enabled: !!jobId,
  });

  const handleRoomSelect = (room: Room | null) => {
    setSelectedRoom(room);
  };

  const handleExportJSON = () => {
    if (data?.rooms && jobId) {
      exportRoomsAsJSON(data.rooms, jobId);
    }
  };

  const handleExportCSV = () => {
    if (data?.rooms) {
      exportRoomsAsCSV(data.rooms);
    }
  };

  if (!jobId) {
    return (
      <Container>
        <Typography>Invalid job ID</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(ROUTES.UPLOAD)}
          sx={{ mb: 2 }}
        >
          Upload Another Blueprint
        </Button>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h2">Detection Results</Typography>

          {data?.rooms && data.rooms.length > 0 && (
            <ButtonGroup variant="outlined">
              <Button startIcon={<JSONIcon />} onClick={handleExportJSON}>
                Export JSON
              </Button>
              <Button startIcon={<CSVIcon />} onClick={handleExportCSV}>
                Export CSV
              </Button>
            </ButtonGroup>
          )}
        </Box>
      </Box>

      <Box sx={{ mb: 3 }}>
        <JobStatus jobId={jobId} />
      </Box>

      {isLoading && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <SkeletonCard />
          </Grid>
          <Grid item xs={12} md={4}>
            <SkeletonCard />
          </Grid>
        </Grid>
      )}

      {error && (
        <RetryError
          message={error instanceof Error ? error.message : 'Failed to load results'}
          onRetry={() => refetch()}
        />
      )}

      {data?.status === 'completed' && data.rooms && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <BlueprintCanvas
              imageUrl={`https://placeholder-image-url.com/${jobId}.png`} // TODO: Get actual image URL
              rooms={data.rooms}
              onRoomSelect={handleRoomSelect}
              selectedRoomId={selectedRoom?.id || null}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <RoomList
                rooms={data.rooms}
                selectedRoomId={selectedRoom?.id || null}
                onRoomSelect={handleRoomSelect}
              />

              {selectedRoom && (
                <RoomDetailsPanel
                  room={selectedRoom}
                  index={data.rooms.findIndex((r) => r.id === selectedRoom.id)}
                />
              )}
            </Box>
          </Grid>
        </Grid>
      )}

      {data?.status === 'failed' && (
        <Typography color="error">
          Detection failed. Please try uploading again.
        </Typography>
      )}
    </Container>
  );
}
```

**Verification:** Navigate to results page and test with mock data.

### 8. Add Zoom and Pan Controls
**Estimated Time:** 30 minutes

```tsx
// frontend/src/components/Visualization/CanvasControls.tsx
import { Box, IconButton, ButtonGroup, Tooltip } from '@mui/material';
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
```

**Verification:** Add controls to canvas and test zoom functionality.

## Acceptance Criteria

- [ ] Canvas renders blueprint image correctly
- [ ] Room boundaries drawn as polygons with lines
- [ ] Rooms are color-coded for easy identification
- [ ] Room labels display at polygon center
- [ ] Click to select room and highlight
- [ ] Room details panel shows metadata
- [ ] Room list displays all detected rooms
- [ ] Export to JSON downloads correct data
- [ ] Export to CSV creates valid CSV file
- [ ] Zoom and pan controls work smoothly
- [ ] Responsive layout on different screen sizes
- [ ] Loading states display skeleton UI
- [ ] Error states show retry option

## Testing Instructions

```bash
cd frontend

# Start dev server
npm run dev

# Test scenarios:

# 1. Canvas rendering
# - Navigate to results page with job ID
# - Blueprint image should load and display
# - Room boundaries should overlay correctly

# 2. Room interaction
# - Click on different rooms
# - Selected room should highlight
# - Room details should update

# 3. Room list
# - Click rooms in list
# - Canvas should highlight selected room
# - List should scroll if many rooms

# 4. Export functionality
# - Click "Export JSON" button
# - JSON file should download with correct data
# - Click "Export CSV" button
# - CSV file should download

# 5. Zoom controls
# - Click zoom in/out buttons
# - Canvas should scale appropriately
# - Reset should return to original size

# 6. Responsive design
# - Resize browser window
# - Layout should adapt
# - Canvas should resize proportionally

# 7. Loading states
# - Hard refresh page
# - Should see skeleton loading UI
# - Should smoothly transition to content
```

## Estimated Total Time
**4-5 hours** for a junior engineer following step-by-step.

## Next Steps
After PR-9 is merged:
- **PR-10** (Testing and Documentation) - comprehensive testing of visualization

## Notes for Junior Engineers

- **Konva is canvas-based** - better performance than SVG for many shapes
- **Points array format** - Konva uses flat array [x1, y1, x2, y2]
- **Image CORS** - set crossOrigin for canvas export
- **Perfect draw disabled** - improves performance for complex shapes
- **Event listeners** - onClick and onTap for touch devices
- **Blob URLs** - create downloadable files without server
- **Remember to cleanup** - revoke blob URLs after download
- **Canvas coordinates** - scale coordinates when image is resized
- **State for selection** - track selected room ID for highlighting
- **Color consistency** - use modulo to cycle through color palette
