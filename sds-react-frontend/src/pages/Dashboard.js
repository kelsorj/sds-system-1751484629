import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Paper,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { chemicalService } from '../services/chemicalService';
import { sdsService } from '../services/sdsService';

const StatCard = ({ title, value, icon, color }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Grid container spacing={3} sx={{ justifyContent: 'space-between' }}>
        <Grid item>
          <Typography color="textSecondary" gutterBottom variant="overline">
            {title}
          </Typography>
          <Typography color="textPrimary" variant="h4">
            {value}
          </Typography>
        </Grid>
        <Grid item>
          {React.cloneElement(icon, { style: { color, fontSize: 48 } })}
        </Grid>
      </Grid>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalChemicals: 0,
    chemicalsWithSds: 0,
    pendingSdsDownloads: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // In a real app, you would fetch this data from your backend
        // Here we're simulating it for demonstration
        // const dashboardData = await api.get('/dashboard/stats');
        
        // Simulate API call delay
        setTimeout(() => {
          setStats({
            totalChemicals: 156,
            chemicalsWithSds: 143,
            pendingSdsDownloads: 13,
            recentActivity: [
              { id: 1, type: 'import', message: 'Imported 15 new chemicals', timestamp: '2 hours ago', status: 'success' },
              { id: 2, type: 'download', message: 'Downloaded SDS for Acetone (67-64-1)', timestamp: '3 hours ago', status: 'success' },
              { id: 3, type: 'error', message: 'Failed to download SDS for Benzene (71-43-2)', timestamp: '5 hours ago', status: 'error' }
            ]
          });
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <LinearProgress />;
  }

  const { totalChemicals, chemicalsWithSds, pendingSdsDownloads, recentActivity } = stats;
  const sdsCompletionPercentage = totalChemicals > 0 
    ? Math.round((chemicalsWithSds / totalChemicals) * 100) 
    : 0;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      {/* Stats summary */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard 
            title="TOTAL CHEMICALS" 
            value={totalChemicals} 
            icon={<AssignmentIcon />}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard 
            title="SDS DOCUMENTS" 
            value={chemicalsWithSds} 
            icon={<CheckCircleIcon />}
            color="#2e7d32"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard 
            title="PENDING SDS" 
            value={pendingSdsDownloads} 
            icon={<WarningIcon />}
            color="#ed6c02"
          />
        </Grid>
      </Grid>

      {/* SDS Completion Status */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          SDS Documentation Status
        </Typography>
        <Box display="flex" alignItems="center">
          <Box width="100%" mr={1}>
            <LinearProgress 
              variant="determinate" 
              value={sdsCompletionPercentage} 
              sx={{ height: 10, borderRadius: 5 }} 
            />
          </Box>
          <Box minWidth={35}>
            <Typography variant="body2" color="textSecondary">
              {`${sdsCompletionPercentage}%`}
            </Typography>
          </Box>
        </Box>
        <Typography variant="body2" color="textSecondary" mt={1}>
          {`${chemicalsWithSds} out of ${totalChemicals} chemicals have SDS documents`}
        </Typography>
      </Paper>

      {/* Recent Activity */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Recent Activity
        </Typography>
        <List>
          {recentActivity.map((activity) => (
            <ListItem key={activity.id}>
              <ListItemIcon>
                {activity.status === 'success' ? 
                  <CheckCircleIcon color="success" /> : 
                  <ErrorIcon color="error" />}
              </ListItemIcon>
              <ListItemText 
                primary={activity.message}
                secondary={activity.timestamp}
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

export default Dashboard;
