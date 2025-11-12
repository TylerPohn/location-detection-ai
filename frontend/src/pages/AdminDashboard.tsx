import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Chip,
  Button,
  CircularProgress,
  IconButton,
  Card,
  CardContent,
  Grid,
  TextField,
  InputAdornment,
  alpha,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PeopleIcon from '@mui/icons-material/People';
import WorkIcon from '@mui/icons-material/Work';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import SearchIcon from '@mui/icons-material/Search';
import { getAllUsers, getAllJobs } from '@/services/firestore';
import { getJobStatus } from '@/services/api';
import type { UserProfile, Job } from '@/types/auth';
import { ROUTES } from '@/types/routes';
import { JobsTable, type JobData } from '@/components/Jobs/JobsTable';
import { JobsTableSkeleton } from '@/components/Jobs/JobsTableSkeleton';
import { useJobStatistics } from '@/hooks/useJobStatistics';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

interface JobWithEmail extends Job {
  userEmail?: string;
  realStatus?: string;
}

export function AdminDashboard() {
  const [tabValue, setTabValue] = useState(0);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [jobs, setJobs] = useState<JobData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const statistics = useJobStatistics(jobs);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersData, jobsData] = await Promise.all([
        getAllUsers(),
        getAllJobs(),
      ]);
      setUsers(usersData);

      // Create a map of userId -> user for quick lookup
      const userMap = new Map(usersData.map(u => [u.uid, u]));

      // Enrich jobs with user email and fetch real status from backend
      const enrichedJobs = await Promise.all(
        jobsData.map(async (job) => {
          const user = userMap.get(job.userId);
          let realStatus = job.status;

          // Try to get real status from backend
          try {
            const backendStatus = await getJobStatus(job.jobId);
            realStatus = backendStatus.status;
          } catch (error) {
            // If backend fails (404, etc.), keep Firestore status
            console.log(`Could not fetch status for job ${job.jobId}:`, error);
          }

          return {
            jobId: job.jobId,
            fileName: job.fileName,
            status: realStatus,
            uploadedAt: job.uploadedAt,
            userEmail: user?.email || 'Unknown',
          } as JobData;
        })
      );

      // Sort jobs by uploadedAt in descending order (newest first)
      enrichedJobs.sort((a, b) => {
        const timeA = a.uploadedAt?.toDate ? a.uploadedAt.toDate().getTime() : new Date(a.uploadedAt).getTime();
        const timeB = b.uploadedAt?.toDate ? b.uploadedAt.toDate().getTime() : new Date(b.uploadedAt).getTime();
        return timeB - timeA;
      });

      setJobs(enrichedJobs);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  // Calculate user statistics
  const adminUsers = users.filter(u => u.role === 'admin').length;
  const studentUsers = users.filter(u => u.role === 'student').length;

  // Filter users based on search
  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  return (
    <Box sx={{ px: { xs: 2, sm: 3, md: 4, lg: 6, xl: 8 }, py: { xs: 3, md: 4, lg: 5 }, width: '100%', maxWidth: '100%' }}>
      {/* Header with gradient background */}
      <Box
          sx={{
            mb: { xs: 3, md: 4 },
            p: { xs: 2.5, md: 3, lg: 4 },
            borderRadius: 3,
            background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            border: (theme) => `1px solid ${alpha(theme.palette.primary.light, 0.2)}`,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: { xs: 'wrap', md: 'nowrap' }, gap: 2 }}>
            <Box>
              <Typography variant="h3" component="h1" sx={{ fontWeight: 700, mb: 1, fontSize: { xs: '2rem', md: '2.5rem', lg: '3rem' } }}>
                Admin Dashboard
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9, fontSize: { xs: '0.875rem', md: '1rem' } }}>
                Manage users, monitor jobs, and track system performance
              </Typography>
            </Box>
            <IconButton
              onClick={fetchData}
              disabled={loading}
              sx={{
                bgcolor: 'rgba(255,255,255,0.15)',
                width: { xs: 48, md: 56 },
                height: { xs: 48, md: 56 },
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.25)',
                  transform: 'rotate(180deg) scale(1.1)',
                },
                transition: 'all 0.4s',
              }}
            >
              <RefreshIcon sx={{ fontSize: { xs: 24, md: 28 } }} />
            </IconButton>
          </Box>
        </Box>

        {/* Statistics Cards */}
        <Grid container spacing={{ xs: 2, md: 3, lg: 4 }} sx={{ mb: { xs: 3, md: 4 } }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{
              background: (theme) => `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)} 0%, ${alpha(theme.palette.primary.dark, 0.1)} 100%)`,
              border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              transition: 'all 0.3s',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
              }
            }}>
              <CardContent sx={{ p: { xs: 2, md: 2.5, lg: 3 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                  <PeopleIcon sx={{ mr: 1, color: 'primary.main', fontSize: { xs: 24, md: 28 } }} />
                  <Typography variant="overline" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }}>
                    Total Users
                  </Typography>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 700, fontSize: { xs: '2rem', md: '2.5rem', lg: '3rem' } }}>
                  {users.length}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                  {adminUsers} admins, {studentUsers} students
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{
              background: (theme) => `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.2)} 0%, ${alpha(theme.palette.secondary.dark, 0.1)} 100%)`,
              border: (theme) => `1px solid ${alpha(theme.palette.secondary.main, 0.3)}`,
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              transition: 'all 0.3s',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
              }
            }}>
              <CardContent sx={{ p: { xs: 2, md: 2.5, lg: 3 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                  <WorkIcon sx={{ mr: 1, color: 'secondary.main', fontSize: { xs: 24, md: 28 } }} />
                  <Typography variant="overline" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }}>
                    Total Jobs
                  </Typography>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 700, fontSize: { xs: '2rem', md: '2.5rem', lg: '3rem' } }}>
                  {statistics.total}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                  {statistics.processing} processing
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{
              background: (theme) => `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.2)} 0%, ${alpha(theme.palette.success.dark, 0.1)} 100%)`,
              border: (theme) => `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              transition: 'all 0.3s',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
              }
            }}>
              <CardContent sx={{ p: { xs: 2, md: 2.5, lg: 3 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                  <CheckCircleIcon sx={{ mr: 1, color: 'success.main', fontSize: { xs: 24, md: 28 } }} />
                  <Typography variant="overline" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }}>
                    Completed
                  </Typography>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 700, fontSize: { xs: '2rem', md: '2.5rem', lg: '3rem' } }}>
                  {statistics.completed}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                  {statistics.successRate}% success rate
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{
              background: (theme) => `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.2)} 0%, ${alpha(theme.palette.error.dark, 0.1)} 100%)`,
              border: (theme) => `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              transition: 'all 0.3s',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
              }
            }}>
              <CardContent sx={{ p: { xs: 2, md: 2.5, lg: 3 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                  <ErrorIcon sx={{ mr: 1, color: 'error.main', fontSize: { xs: 24, md: 28 } }} />
                  <Typography variant="overline" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }}>
                    Failed Jobs
                  </Typography>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 700, fontSize: { xs: '2rem', md: '2.5rem', lg: '3rem' } }}>
                  {statistics.failed}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                  {statistics.failureRate}% failure rate
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Paper sx={{
          width: '100%',
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        }}>
          <Box sx={{
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: (theme) => alpha(theme.palette.background.paper, 0.5),
            px: { xs: 2, md: 3 },
          }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="admin dashboard tabs"
              sx={{
                '& .MuiTab-root': {
                  fontSize: { xs: '0.875rem', md: '1rem', lg: '1.125rem' },
                  fontWeight: 600,
                  textTransform: 'none',
                  minHeight: { xs: 56, md: 64, lg: 72 },
                  px: { xs: 2, md: 3, lg: 4 },
                }
              }}
            >
              <Tab label={`Users (${users.length})`} id="admin-tab-0" />
              <Tab label={`Jobs (${jobs.length})`} id="admin-tab-1" />
            </Tabs>
          </Box>

          {/* Users Tab */}
          <TabPanel value={tabValue} index={0}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {/* Search Bar */}
                <Box sx={{ mb: 3 }}>
                  <TextField
                    fullWidth
                    placeholder="Search users by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      }
                    }}
                  />
                </Box>

                <TableContainer>
                  <Table sx={{
                    '& .MuiTableHead-root': {
                      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                    }
                  }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Photo</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Joined Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow
                          key={user.uid}
                          sx={{
                            '&:hover': {
                              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                            },
                            transition: 'background-color 0.2s',
                          }}
                        >
                          <TableCell>
                            <Avatar
                              src={user.photoURL || undefined}
                              alt={user.displayName || user.email}
                              sx={{
                                width: 48,
                                height: 48,
                                boxShadow: 2,
                              }}
                            >
                              {(user.displayName || user.email).charAt(0).toUpperCase()}
                            </Avatar>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 500 }}>
                            {user.displayName || 'N/A'}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Chip
                              label={user.role.toUpperCase()}
                              color={user.role === 'admin' ? 'secondary' : 'primary'}
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell sx={{ color: 'text.secondary' }}>
                            {formatDate(user.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {filteredUsers.length === 0 && (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography variant="body1" color="text.secondary">
                      No users found matching "{searchQuery}"
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </TabPanel>

          {/* Jobs Tab */}
          <TabPanel value={tabValue} index={1}>
            {loading ? (
              <JobsTableSkeleton rows={10} showUserEmail={true} />
            ) : (
              <JobsTable jobs={jobs} loading={loading} showUserEmail={true} />
            )}
          </TabPanel>
      </Paper>
    </Box>
  );
}
