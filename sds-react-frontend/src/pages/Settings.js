import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Switch,
  FormGroup,
  FormControlLabel,
  TextField,
  Button,
  Grid,
  Alert,
  Snackbar,
  Card,
  CardContent,
  CardHeader
} from '@mui/material';

const Settings = () => {
  const [settings, setSettings] = useState({
    notifications: true,
    autoDownloadSDS: false,
    darkMode: false,
    apiBaseUrl: 'http://localhost:6443/api',
    batchSize: 5
  });
  
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  
  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setSettings({
      ...settings,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  const handleSave = (e) => {
    e.preventDefault();
    // In a real app, this would save to localStorage or an API
    console.log('Saving settings:', settings);
    setShowSuccessAlert(true);
  };
  
  const handleCloseAlert = () => {
    setShowSuccessAlert(false);
  };
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="User Interface" />
            <CardContent>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.darkMode}
                      onChange={handleChange}
                      name="darkMode"
                      color="primary"
                    />
                  }
                  label="Dark Mode"
                />
                <Typography variant="body2" color="textSecondary" sx={{ ml: 3, mb: 2 }}>
                  Enable dark theme for the application
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.notifications}
                      onChange={handleChange}
                      name="notifications"
                      color="primary"
                    />
                  }
                  label="Enable Notifications"
                />
                <Typography variant="body2" color="textSecondary" sx={{ ml: 3, mb: 2 }}>
                  Receive notifications about SDS updates and chemical inventory alerts
                </Typography>
              </FormGroup>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="SDS Downloads" />
            <CardContent>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.autoDownloadSDS}
                      onChange={handleChange}
                      name="autoDownloadSDS"
                      color="primary"
                    />
                  }
                  label="Auto-Download SDS Documents"
                />
                <Typography variant="body2" color="textSecondary" sx={{ ml: 3, mb: 2 }}>
                  Automatically download SDS documents when adding new chemicals
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body1" gutterBottom>
                    SDS Download Batch Size
                  </Typography>
                  <TextField
                    name="batchSize"
                    type="number"
                    value={settings.batchSize}
                    onChange={handleChange}
                    variant="outlined"
                    size="small"
                    InputProps={{ inputProps: { min: 1, max: 10 } }}
                    helperText="Number of SDS documents to download simultaneously (1-10)"
                  />
                </Box>
              </FormGroup>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12}>
          <Card>
            <CardHeader title="API Configuration" />
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body1" gutterBottom>
                  API Base URL
                </Typography>
                <TextField
                  fullWidth
                  name="apiBaseUrl"
                  value={settings.apiBaseUrl}
                  onChange={handleChange}
                  variant="outlined"
                  placeholder="http://localhost:6443/api"
                  helperText="URL of the backend API server"
                />
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSave}
                >
                  Save Settings
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Snackbar
        open={showSuccessAlert}
        autoHideDuration={5000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseAlert} severity="success">
          Settings saved successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Settings;
