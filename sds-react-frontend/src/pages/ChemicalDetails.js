import React from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Paper, CircularProgress } from '@mui/material';

const ChemicalDetails = () => {
  const { casNumber } = useParams();
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Chemical Details
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6">
          Viewing details for chemical with CAS: {casNumber}
        </Typography>
        <Typography variant="body1" color="textSecondary">
          This page will display detailed information about the chemical, including properties, 
          hazards, inventory, and links to SDS documents.
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
        <Typography align="center">
          Component under development
        </Typography>
      </Paper>
    </Box>
  );
};

export default ChemicalDetails;
