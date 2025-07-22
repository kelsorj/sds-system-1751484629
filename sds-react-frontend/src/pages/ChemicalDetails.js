import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  CircularProgress, 
  Alert, 
  Grid, 
  Card, 
  CardContent, 
  Button, 
  Chip,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import { 
  Description as DescriptionIcon,
  Science as ScienceIcon,
  Warning as WarningIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { chemicalService } from '../services/chemicalService';
import { sdsService } from '../services/sdsService';

const ChemicalDetails = () => {
  const { casNumber } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chemicalData, setChemicalData] = useState(null);
  const [sdsData, setSdsData] = useState(null);
  const [ghsData, setGhsData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('Fetching chemical details for CAS:', casNumber);
        
        // Fetch chemical data
        let chemical = null;
        try {
          chemical = await chemicalService.getChemical(casNumber);
          console.log('Chemical data:', chemical);
          setChemicalData(chemical);
        } catch (chemErr) {
          console.error('Error fetching chemical:', chemErr);
        }
        
        // Fetch SDS data
        let sds = null;
        try {
          sds = await sdsService.getSdsInfo(casNumber);
          console.log('SDS data:', sds);
          setSdsData(sds);
        } catch (sdsErr) {
          console.log('No SDS data found:', sdsErr.message);
        }
        
        // Fetch GHS data
        let ghs = null;
        try {
          ghs = await sdsService.getGhsData(casNumber);
          console.log('GHS data:', ghs);
          setGhsData(ghs);
        } catch (ghsErr) {
          console.log('No GHS data found:', ghsErr.message);
        }
        
        // If no data found at all, show error
        if (!chemical && !sds && !ghs) {
          setError('No data found for this chemical. The CAS number may not exist in the system.');
        }
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(`Failed to load chemical data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    if (casNumber) {
      fetchData();
    } else {
      setLoading(false);
      setError('No CAS number provided');
    }
  }, [casNumber]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Chemical Details
        </Typography>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Chemical Details
      </Typography>
      
      <Grid container spacing={3}>
        {/* Basic Chemical Information */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ScienceIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Basic Information</Typography>
              </Box>
              
              <Typography variant="h5" gutterBottom>
                {chemicalData?.name || 'Unknown Chemical'}
              </Typography>
              
              <Typography variant="subtitle1" color="textSecondary" gutterBottom>
                CAS Number: {casNumber}
              </Typography>
              
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">
                    <strong>Molecular Formula:</strong> {chemicalData?.molecular_formula || 'Not available'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">
                    <strong>Molecular Weight:</strong> {chemicalData?.molecular_weight || 'Not available'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">
                    <strong>Density:</strong> {chemicalData?.density || 'Not available'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">
                    <strong>Boiling Point:</strong> {chemicalData?.boiling_point || 'Not available'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">
                    <strong>Melting Point:</strong> {chemicalData?.melting_point || 'Not available'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">
                    <strong>Flash Point:</strong> {chemicalData?.flash_point || 'Not available'}
                  </Typography>
                </Grid>
              </Grid>
              
              {chemicalData?.description && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Description:</strong> {chemicalData.description}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        {/* Actions and SDS Info */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <DescriptionIcon sx={{ mr: 1, color: 'secondary.main' }} />
                <Typography variant="h6">SDS Documents</Typography>
              </Box>
              
              {sdsData ? (
                <Box>
                  <Typography variant="body2" gutterBottom>
                    SDS document available
                  </Typography>
                  <Button 
                    variant="contained" 
                    startIcon={<DescriptionIcon />}
                    onClick={() => navigate(`/sds/${casNumber}`)}
                    sx={{ mb: 2, width: '100%' }}
                  >
                    View SDS Document
                  </Button>
                  {sdsData.date_added && (
                    <Typography variant="caption" color="textSecondary">
                      Added: {formatDate(sdsData.date_added)}
                    </Typography>
                  )}
                </Box>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No SDS document available for this chemical
                </Typography>
              )}
            </CardContent>
          </Card>
          
          {/* GHS Information */}
          {ghsData && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <WarningIcon sx={{ mr: 1, color: 'warning.main' }} />
                  <Typography variant="h6">GHS Classification</Typography>
                </Box>
                
                {ghsData.signal_word && (
                  <Box sx={{ mb: 2 }}>
                    <Chip 
                      label={ghsData.signal_word} 
                      color={ghsData.signal_word.toLowerCase() === 'danger' ? 'error' : 'warning'}
                      size="small"
                    />
                  </Box>
                )}
                
                {ghsData.hazard_statements && ghsData.hazard_statements.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Hazard Statements:
                    </Typography>
                    <List dense>
                      {ghsData.hazard_statements.slice(0, 3).map((statement, index) => (
                        <ListItem key={index} sx={{ py: 0 }}>
                          <ListItemText 
                            primary={statement} 
                            primaryTypographyProps={{ variant: 'caption' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}
        </Grid>
        
        {/* Additional Information */}
        {chemicalData && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Additional Information
                </Typography>
                <Grid container spacing={2}>
                  {chemicalData.created_at && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2">
                        <strong>Added to System:</strong> {formatDate(chemicalData.created_at)}
                      </Typography>
                    </Grid>
                  )}
                  {chemicalData.updated_at && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2">
                        <strong>Last Updated:</strong> {formatDate(chemicalData.updated_at)}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default ChemicalDetails;
