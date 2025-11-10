import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Skeleton,
  Box,
  alpha,
} from '@mui/material';

interface JobsTableSkeletonProps {
  rows?: number;
  showUserEmail?: boolean;
}

export function JobsTableSkeleton({ rows = 5, showUserEmail = false }: JobsTableSkeletonProps) {
  return (
    <Box>
      {/* Search and Filter Skeletons */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <Skeleton variant="rounded" width="100%" height={56} sx={{ flex: 1, minWidth: 250 }} />
        <Skeleton variant="rounded" width={200} height={56} />
      </Box>

      {/* Table Skeleton */}
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 2,
          border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Table
          sx={{
            '& .MuiTableHead-root': {
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
            },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Job ID</TableCell>
              {showUserEmail && <TableCell sx={{ fontWeight: 600 }}>User Email</TableCell>}
              <TableCell sx={{ fontWeight: 600 }}>File Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Uploaded Date</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.from({ length: rows }).map((_, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Skeleton variant="text" width={100} />
                </TableCell>
                {showUserEmail && (
                  <TableCell>
                    <Skeleton variant="text" width={150} />
                  </TableCell>
                )}
                <TableCell>
                  <Skeleton variant="text" width={200} />
                </TableCell>
                <TableCell>
                  <Skeleton variant="rounded" width={80} height={24} />
                </TableCell>
                <TableCell>
                  <Skeleton variant="text" width={150} />
                </TableCell>
                <TableCell>
                  <Skeleton variant="rounded" width={80} height={32} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination Skeleton */}
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
        <Skeleton variant="text" width={120} />
        <Skeleton variant="text" width={80} />
      </Box>
    </Box>
  );
}
