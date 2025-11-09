// Room list component for selecting rooms
import {
  Box,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  Chip,
  Paper,
} from '@mui/material';
import type { Room } from '../../types/api';
import { generateRoomColor, formatArea } from '../../utils/canvas';

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
