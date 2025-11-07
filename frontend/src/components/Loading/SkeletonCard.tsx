// Loading skeleton for cards

import { Card, CardContent, Skeleton, Box } from '@mui/material';

export function SkeletonCard() {
  return (
    <Card>
      <Skeleton variant="rectangular" height={200} />
      <CardContent>
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="40%" />
        <Box sx={{ mt: 2 }}>
          <Skeleton variant="text" />
          <Skeleton variant="text" />
        </Box>
      </CardContent>
    </Card>
  );
}
