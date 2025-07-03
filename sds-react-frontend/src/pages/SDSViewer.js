import React from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Paper, Grid, Card, CardContent, Button } from '@mui/material';
import { GetApp as GetAppIcon } from '@mui/icons-material';

const SDSViewer = () => {
  const { casNumber } = useParams();
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        SDS Document Viewer
      </Typography>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <Typography variant="h6" gutterBottom>
              SDS for Chemical: {casNumber}
            </Typography>
            <Typography variant="body1" paragraph>
              This component will display the SDS document for the selected chemical.
              In production, it would include a PDF viewer or embedded document viewer.
            </Typography>
            <Box sx={{ height: 400, bgcolor: '#f5f5f5', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px dashed #ccc', borderRadius: 1, mb: 2 }}>
              <Typography variant="body2" color="textSecondary">
                PDF Viewer Placeholder
              </Typography>
            </Box>
            <Button
              variant="contained" 
              startIcon={<GetAppIcon />}
              sx={{ mt: 1 }}
            >
              Download PDF
            </Button>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  GHS Information
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Hazard Statements:</strong>
                  <ul>
                    <li>H225: Highly flammable liquid and vapor</li>
                    <li>H319: Causes serious eye irritation</li>
                    <li>H336: May cause drowsiness or dizziness</li>
                  </ul>
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Precautionary Statements:</strong>
                  <ul>
                    <li>P210: Keep away from heat, hot surfaces, sparks, open flames and other ignition sources</li>
                    <li>P233: Keep container tightly closed</li>
                    <li>P261: Avoid breathing dust/fume/gas/mist/vapors/spray</li>
                  </ul>
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
      <Typography variant="body2" color="textSecondary">
        Last updated: 2023-11-14
      </Typography>
    </Box>
  );
};

export default SDSViewer;
