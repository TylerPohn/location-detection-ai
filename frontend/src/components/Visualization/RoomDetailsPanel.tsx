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
import { formatArea, formatPerimeter, generateRoomColor } from '../../utils/canvas';

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
