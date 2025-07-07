import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Alert,
  Box, 
  Button, 
  CircularProgress, 
  Divider, 
  FormControl,
  FormHelperText,
  Grid, 
  InputLabel,
  MenuItem,
  Paper, 
  Select,
  Snackbar,
  TextField, 
  Typography 
} from '@mui/material';
import { 
  Save as SaveIcon,
  Cancel as CancelIcon,
  Science as ScienceIcon
} from '@mui/icons-material';
import { chemicalService } from '../services/chemicalService';
import MoleculeViewer from '../components/MoleculeViewer';

const ChemicalForm = () => {
  const { casNumber } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!casNumber;
  
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [formErrors, setFormErrors] = useState({});
  
  const [chemical, setChemical] = useState({
    name: '',
    cas_number: '',
    molecular_formula: '',
    smiles: '',
    quantity: 0,
    unit: 'g',
    location: '',
    has_sds: false,
  });
  
  // Units for dropdown
  const units = ['g', 'kg', 'mg', 'μg', 'L', 'mL', 'μL'];
  
  // Load chemical data if in edit mode
  useEffect(() => {
    if (isEditMode) {
      fetchChemicalDetails();
    }
  }, [isEditMode, casNumber]);
  
  const fetchChemicalDetails = async () => {
    try {
      setLoading(true);
      const data = await chemicalService.getChemical(casNumber);
      console.log('Fetched chemical details:', data);
      setChemical(data);
    } catch (err) {
      console.error('Error fetching chemical details:', err);
      setError(`Failed to load chemical data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle form input changes
  const handleChange = (event) => {
    const { name, value } = event.target;
    setChemical(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear field-specific error when field is edited
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };
  
  // Validate form before submission
  const validateForm = () => {
    const errors = {};
    
    if (!chemical.name?.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!chemical.cas_number?.trim()) {
      errors.cas_number = 'CAS Number is required';
    } else if (!/^\d{1,7}-\d{2}-\d{1}$/.test(chemical.cas_number)) {
      errors.cas_number = 'Invalid CAS Number format (e.g. 1234567-89-0)';
    }
    
    if (chemical.quantity < 0) {
      errors.quantity = 'Quantity must be non-negative';
    }
    
    if (!chemical.unit) {
      errors.unit = 'Unit is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      if (isEditMode) {
        await chemicalService.updateChemical(casNumber, chemical);
        setSuccessMessage('Chemical updated successfully');
      } else {
        await chemicalService.addChemical(chemical);
        setSuccessMessage('Chemical added successfully');
        // Clear form after successful addition
        if (!isEditMode) {
          setChemical({
            name: '',
            cas_number: '',
            molecular_formula: '',
            smiles: '',
            quantity: 0,
            unit: 'g',
            location: '',
            has_sds: false,
          });
        }
      }
    } catch (err) {
      console.error('Error saving chemical:', err);
      setError(`Failed to save chemical: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };
  
  // Handle close of success message
  const handleCloseSuccessMessage = () => {
    setSuccessMessage('');
    if (isEditMode) {
      // Navigate back to list after editing
      navigate('/chemicals');
    }
  };
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {isEditMode ? 'Edit Chemical' : 'Add New Chemical'}
      </Typography>
      
      {loading ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Loading chemical data...</Typography>
        </Paper>
      ) : (
        <Paper sx={{ p: 4 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Left column: Form fields */}
              <Grid item xs={12} md={8}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      name="name"
                      label="Chemical Name"
                      value={chemical.name}
                      onChange={handleChange}
                      fullWidth
                      variant="outlined"
                      error={!!formErrors.name}
                      helperText={formErrors.name}
                      required
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      name="cas_number"
                      label="CAS Number"
                      value={chemical.cas_number}
                      onChange={handleChange}
                      fullWidth
                      variant="outlined"
                      error={!!formErrors.cas_number}
                      helperText={formErrors.cas_number || 'Format: 1234567-89-0'}
                      required
                      disabled={isEditMode} // Cannot change CAS in edit mode
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      name="molecular_formula"
                      label="Molecular Formula"
                      value={chemical.molecular_formula}
                      onChange={handleChange}
                      fullWidth
                      variant="outlined"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      name="smiles"
                      label="SMILES"
                      value={chemical.smiles}
                      onChange={handleChange}
                      fullWidth
                      variant="outlined"
                      multiline
                      rows={2}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Grid container spacing={2}>
                      <Grid item xs={8}>
                        <TextField
                          name="quantity"
                          label="Quantity"
                          type="number"
                          value={chemical.quantity}
                          onChange={handleChange}
                          fullWidth
                          variant="outlined"
                          error={!!formErrors.quantity}
                          helperText={formErrors.quantity}
                          InputProps={{ inputProps: { min: 0 } }}
                        />
                      </Grid>
                      <Grid item xs={4}>
                        <FormControl fullWidth variant="outlined" error={!!formErrors.unit}>
                          <InputLabel id="unit-label">Unit</InputLabel>
                          <Select
                            labelId="unit-label"
                            name="unit"
                            value={chemical.unit}
                            onChange={handleChange}
                            label="Unit"
                          >
                            {units.map(unit => (
                              <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                            ))}
                          </Select>
                          {formErrors.unit && <FormHelperText>{formErrors.unit}</FormHelperText>}
                        </FormControl>
                      </Grid>
                    </Grid>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      name="location"
                      label="Storage Location"
                      value={chemical.location}
                      onChange={handleChange}
                      fullWidth
                      variant="outlined"
                    />
                  </Grid>
                </Grid>
              </Grid>
              
              {/* Right column: Structure visualization */}
              <Grid item xs={12} md={4}>
                <Paper 
                  elevation={2} 
                  sx={{ 
                    p: 2, 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: '#f5f9ff'
                  }}
                >
                  <Box display="flex" alignItems="center" mb={2}>
                    <ScienceIcon sx={{ mr: 1 }} />
                    <Typography variant="h6">Structure Visualization</Typography>
                  </Box>
                  
                  {chemical.smiles ? (
                    <MoleculeViewer 
                      smiles={chemical.smiles} 
                      width={200} 
                      height={160} 
                    />
                  ) : (
                    <Box 
                      sx={{ 
                        width: 200, 
                        height: 160, 
                        border: '1px dashed #aaa', 
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Typography color="textSecondary" variant="body2">
                        No structure available.
                        <br />Enter a SMILES string to view.
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                
                <Box display="flex" justifyContent="space-between">
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => navigate('/chemicals')}
                    startIcon={<CancelIcon />}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    startIcon={<SaveIcon />}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <CircularProgress size={24} sx={{ mr: 1 }} />
                        Saving...
                      </>
                    ) : (
                      isEditMode ? 'Save Changes' : 'Add Chemical'
                    )}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </Paper>
      )}
      
      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={handleCloseSuccessMessage}
        message={successMessage}
      />
    </Box>
  );
};

export default ChemicalForm;
