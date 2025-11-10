// Room details panel component
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
import type { Room } from '../../types/api';
import {
  formatArea,
  formatPerimeter,
  generateRoomColor,
  calculateBoundingBoxArea,
  calculateBoundingBoxPerimeter
} from '../../utils/canvas';

interface RoomDetailsPanelProps {
  room: Room;
  index: number;
}

export function RoomDetailsPanel({ room, index }: RoomDetailsPanelProps) {
  const color = generateRoomColor(index);

  // Calculate area and perimeter based on available data
  const area = room.bounding_box
    ? calculateBoundingBoxArea(room.bounding_box)
    : room.area || 0;

  const perimeter = room.bounding_box
    ? calculateBoundingBoxPerimeter(room.bounding_box)
    : room.perimeter || 0;

  return (
    <Card sx={{ borderLeft: 4, borderColor: color }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <LabelIcon />
          <Typography variant="h6">{room.id}</Typography>
          {room.name_hint && (
            <Chip label={room.name_hint} size="small" variant="outlined" />
          )}
          {room.confidence && (
            <Chip
              label={`${(room.confidence * 100).toFixed(0)}% confidence`}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Box>

        <List dense>
          <ListItem>
            <SquareIcon sx={{ mr: 2, color: 'text.secondary' }} fontSize="small" />
            <ListItemText
              primary="Area"
              secondary={formatArea(area)}
            />
          </ListItem>

          <ListItem>
            <PerimeterIcon sx={{ mr: 2, color: 'text.secondary' }} fontSize="small" />
            <ListItemText
              primary="Perimeter"
              secondary={formatPerimeter(perimeter)}
            />
          </ListItem>

          <Divider sx={{ my: 1 }} />

          {room.bounding_box ? (
            <>
              <ListItem>
                <ListItemText
                  primary="Bounding Box"
                  secondary={`(${room.bounding_box[0].toFixed(0)}, ${room.bounding_box[1].toFixed(0)}) to (${room.bounding_box[2].toFixed(0)}, ${room.bounding_box[3].toFixed(0)})`}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Width × Height"
                  secondary={`${(room.bounding_box[2] - room.bounding_box[0]).toFixed(0)} × ${(room.bounding_box[3] - room.bounding_box[1]).toFixed(0)} px`}
                />
              </ListItem>
            </>
          ) : (
            <>
              <ListItem>
                <ListItemText
                  primary="Vertices"
                  secondary={`${room.polygon?.length || 0} points`}
                />
              </ListItem>

              <ListItem>
                <ListItemText
                  primary="Lines"
                  secondary={`${room.lines?.length || 0} segments`}
                />
              </ListItem>
            </>
          )}
        </List>

        {room.bounding_box && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Bounding Box Coordinates
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <Typography
                variant="caption"
                component="div"
                sx={{ fontFamily: 'monospace' }}
              >
                Top-Left: ({room.bounding_box[0].toFixed(0)}, {room.bounding_box[1].toFixed(0)})
              </Typography>
              <Typography
                variant="caption"
                component="div"
                sx={{ fontFamily: 'monospace' }}
              >
                Bottom-Right: ({room.bounding_box[2].toFixed(0)}, {room.bounding_box[3].toFixed(0)})
              </Typography>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
