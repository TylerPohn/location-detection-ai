// Results page with full visualization layout (PR-9)
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
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(ROUTES.HOME)}
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

      {data?.status === 'completed' && data.rooms && data.rooms.length > 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <BlueprintCanvas
              imageUrl={`/api/v1/images/${jobId}.png`}
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

      {data?.status === 'completed' && (!data.rooms || data.rooms.length === 0) && (
        <Typography>
          No rooms detected in this blueprint. Try uploading a different image.
        </Typography>
      )}

      {data?.status === 'failed' && (
        <Typography color="error">
          Detection failed: {data.error_message || 'Unknown error'}
        </Typography>
      )}
    </Container>
  );
}
