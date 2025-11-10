import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  TextField,
  InputAdornment,
  Box,
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  TablePagination,
  alpha,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/types/routes';
import type { JobStatus } from '@/types/auth';

export interface JobData {
  jobId: string;
  fileName: string;
  status: JobStatus;
  uploadedAt: any;
  userEmail?: string;
}

interface JobsTableProps {
  jobs: JobData[];
  loading?: boolean;
  showUserEmail?: boolean;
}

export function JobsTable({ jobs, loading = false, showUserEmail = false }: JobsTableProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  const handleViewResults = (jobId: string) => {
    navigate(ROUTES.RESULTS.replace(':jobId', jobId));
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Filter jobs by search and status
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.jobId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (showUserEmail && job.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Paginate filtered jobs
  const paginatedJobs = filteredJobs.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box>
      {/* Search and Filter Controls */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          placeholder={`Search by ${showUserEmail ? 'ID, filename, or email' : 'ID or filename'}...`}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(0);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{
            flex: 1,
            minWidth: 250,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            },
          }}
        />
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => {
              setStatusFilter(e.target.value as JobStatus | 'all');
              setPage(0);
            }}
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="processing">Processing</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Table */}
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
            {paginatedJobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showUserEmail ? 6 : 5} sx={{ textAlign: 'center', py: 8 }}>
                  <Typography variant="body1" color="text.secondary">
                    {filteredJobs.length === 0 && searchQuery
                      ? `No jobs found matching "${searchQuery}"`
                      : filteredJobs.length === 0 && statusFilter !== 'all'
                      ? `No ${statusFilter} jobs found`
                      : 'No jobs yet'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedJobs.map((job) => (
                <TableRow
                  key={job.jobId}
                  sx={{
                    '&:hover': {
                      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                    },
                    transition: 'background-color 0.2s',
                  }}
                >
                  <TableCell
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      color: 'text.secondary',
                    }}
                  >
                    {job.jobId.substring(0, 8)}...
                  </TableCell>
                  {showUserEmail && (
                    <TableCell sx={{ fontWeight: 500 }}>{job.userEmail}</TableCell>
                  )}
                  <TableCell>{job.fileName}</TableCell>
                  <TableCell>
                    <Chip
                      label={job.status}
                      color={
                        job.status === 'completed'
                          ? 'success'
                          : job.status === 'failed'
                          ? 'error'
                          : job.status === 'processing'
                          ? 'warning'
                          : 'default'
                      }
                      size="small"
                      sx={{
                        fontWeight: 600,
                        textTransform: 'uppercase',
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>
                    {formatDate(job.uploadedAt)}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<VisibilityIcon />}
                      onClick={() => handleViewResults(job.jobId)}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 500,
                      }}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {filteredJobs.length > 0 && (
        <TablePagination
          rowsPerPageOptions={[5, 10, 20, 50]}
          component="div"
          count={filteredJobs.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{
            mt: 2,
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
              mb: 0,
            },
          }}
        />
      )}
    </Box>
  );
}
