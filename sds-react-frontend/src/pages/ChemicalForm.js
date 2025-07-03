import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Button } from '@mui/material';

const ChemicalForm = () => {
  const { casNumber } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!casNumber;
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {isEditMode ? 'Edit Chemical' : 'Add New Chemical'}
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1" color="textSecondary" paragraph>
          {isEditMode 
            ? `This page will provide a form to edit chemical with CAS: ${casNumber}` 
            : 'This page will provide a form to add a new chemical to the inventory'}
        </Typography>
        <Typography variant="body1" paragraph>
          The form will include fields for name, CAS number, formula, quantity, unit, and other properties.
        </Typography>
        <Box sx={{ mt: 3 }}>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => navigate('/chemicals')}
          >
            Back to Chemical List
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default ChemicalForm;
