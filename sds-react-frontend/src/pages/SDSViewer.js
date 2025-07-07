import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Paper, Grid, Card, CardContent, Button, CircularProgress, Alert, IconButton } from '@mui/material';
import { GetApp as GetAppIcon, Error as ErrorIcon, CheckCircle as CheckCircleIcon, ZoomIn, ZoomOut, Fullscreen, FullscreenExit } from '@mui/icons-material';
import { sdsService } from '../services/sdsService';
import { chemicalService } from '../services/chemicalService';

const SDSViewer = () => {
  const { casNumber } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chemicalData, setChemicalData] = useState(null);
  const [sdsData, setSdsData] = useState(null);
  const [downloadStatus, setDownloadStatus] = useState(null);
  
  // PDF viewer state
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfError, setPdfError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.log('Error parsing date:', error);
      return '-';
    }
  };
  
  // Helper function to parse array/string data
  const parseArrayData = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch (e) {
        return data.replace(/[\[\]'"]/g, '').split(',').map(item => item.trim()).filter(item => item);
      }
    }
    return [];
  };

  // Download SDS PDF
  const downloadSds = () => {
    console.log('Downloading SDS with data:', sdsData);
    if (!sdsData || !sdsData.file_path) {
      console.error('No file path available for download');
      setDownloadStatus('error');
      setTimeout(() => setDownloadStatus(null), 3000);
      return;
    }

    setDownloadStatus('loading');
    try {
      // Make sure file_path is properly encoded
      const encodedFilePath = encodeURIComponent(sdsData.file_path);
      console.log('Encoded path:', encodedFilePath);
      const downloadUrl = `/api/sds/download/${encodedFilePath}`;
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `${casNumber}_SDS.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setDownloadStatus('success');
      setTimeout(() => setDownloadStatus(null), 3000);
    } catch (err) {
      console.error('Error downloading SDS:', err);
      setDownloadStatus('error');
      setTimeout(() => setDownloadStatus(null), 3000);
    }
  };

  // Fetch chemical and SDS data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch chemical details
        const chemResponse = await chemicalService.getChemical(casNumber);
        setChemicalData(chemResponse);
        
        // Fetch SDS files
        const sdsResponse = await sdsService.getSdsFiles();
        // Check if the response is properly structured
        if (sdsResponse && sdsResponse.data && Array.isArray(sdsResponse.data)) {
          const matchingSds = sdsResponse.data.find(sds => sds.cas_number === casNumber);
          if (matchingSds) {
            setSdsData(matchingSds);
          } else {
            // Try fetching specific SDS by cas number
            try {
              const specificSds = await sdsService.getSdsInfo(casNumber);
              if (specificSds) {
                setSdsData(specificSds);
              } else {
                setError('No SDS document found for this chemical');
              }
            } catch (sdsErr) {
              console.error('Error fetching specific SDS:', sdsErr);
              setError('No SDS document found for this chemical');
            }
          }
        } else {
          setError('Failed to retrieve SDS documents');
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load chemical and SDS data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [casNumber]);
  
  // Load PDF when SDS data is available
  useEffect(() => {
    if (sdsData && sdsData.file_path) {
      setPdfError(null);
      
      // Create PDF URL
      try {
        const encodedFilePath = encodeURIComponent(sdsData.file_path);
        const pdfFileUrl = `/api/sds/download/${encodedFilePath}`;
        setPdfUrl(pdfFileUrl);
      } catch (err) {
        console.error('Error setting up PDF viewer:', err);
        setPdfError('Failed to load PDF viewer');
      }
    }
  }, [sdsData]);
  
  // Render loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>Loading SDS document...</Typography>
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>SDS Document Viewer</Typography>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  // Parse GHS data
  const hazardStatements = sdsData?.ghs_data?.hazard_statements ? parseArrayData(sdsData.ghs_data.hazard_statements) : [];
  const precautionaryStatements = sdsData?.ghs_data?.precautionary_statements ? parseArrayData(sdsData.ghs_data.precautionary_statements) : [];
  const pictograms = sdsData?.ghs_data?.pictograms ? parseArrayData(sdsData.ghs_data.pictograms) : [];
  
  // Render content
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        SDS Document Viewer
      </Typography>
      
      {downloadStatus === 'success' && (
        <Alert severity="success" sx={{ mb: 2 }}>
          SDS document downloaded successfully
        </Alert>
      )}
      
      {downloadStatus === 'error' && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to download SDS document
        </Alert>
      )}
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Typography variant="h6" gutterBottom>
              {chemicalData?.name || casNumber} ({casNumber})
            </Typography>
            
            <Typography variant="body2" sx={{ mb: 2 }}>
              <strong>Molecular Formula:</strong> {chemicalData?.molecular_formula || 'Not available'}
            </Typography>
            
            <Typography variant="body2" sx={{ mb: 2 }}>
              <strong>Molecular Weight:</strong> {chemicalData?.molecular_weight || 'Not available'}
            </Typography>
            
            {sdsData?.sds_files?.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>SDS Files:</Typography>
                {sdsData.sds_files.map((file, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2">
                      {file.filename} ({file.source}, {file.date_added})
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
            
            <Paper elevation={1} sx={{ 
              mb: 2,
              p: 2,
              border: '1px solid #e0e0e0', 
              borderRadius: 1,
              overflow: 'hidden'
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
                <Typography variant="subtitle1"><strong>SDS Viewer</strong></Typography>
                <Box>
                  <IconButton 
                    onClick={() => setIsFullscreen(!isFullscreen)} 
                    title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                  >
                    {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
                  </IconButton>
                </Box>
              </Box>
              
              {pdfError ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 450, bgcolor: '#f5f5f5' }}>
                  <ErrorIcon color="error" sx={{ mr: 1 }} />
                  <Typography variant="body2" color="error">{pdfError}</Typography>
                </Box>
              ) : pdfUrl ? (
                <Box sx={{ 
                  height: isFullscreen ? 'calc(100vh - 300px)' : 450, 
                  border: '1px solid #eee',
                  overflow: 'hidden',
                  transition: 'height 0.3s ease'
                }}>
                  <iframe 
                    src={pdfUrl}
                    title="SDS Document Viewer"
                    width="100%"
                    height="100%"
                    style={{ border: 'none' }}
                    onError={() => setPdfError('Failed to load PDF document')}
                  />
                </Box>
              ) : (
                <Box sx={{ 
                  height: 450, 
                  bgcolor: '#f5f5f5', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  borderRadius: 1
                }}>
                  <Typography variant="body2" color="textSecondary">
                    No PDF document available
                  </Typography>
                </Box>
              )}
              
              {sdsData?.file_path && (
                <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                  File: {sdsData.file_path}
                </Typography>
              )}
            </Paper>
            
            <Button
              variant="contained" 
              startIcon={downloadStatus === 'loading' ? <CircularProgress size={20} color="inherit" /> : <GetAppIcon />}
              sx={{ mt: 1 }}
              onClick={downloadSds}
              disabled={downloadStatus === 'loading' || !sdsData?.file_path}
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
                
                {pictograms.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Pictograms:</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {pictograms.map((pic, idx) => (
                        <Box 
                          key={idx} 
                          sx={{ 
                            p: 1, 
                            border: '1px solid #ddd',
                            borderRadius: 1,
                            display: 'inline-block'
                          }}
                        >
                          {pic}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
                
                {hazardStatements.length > 0 && (
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    <strong>Hazard Statements:</strong>
                    <ul style={{ paddingLeft: '20px', marginTop: '4px' }}>
                      {hazardStatements.map((statement, idx) => (
                        <li key={idx}>{statement}</li>
                      ))}
                    </ul>
                  </Typography>
                )}
                
                {precautionaryStatements.length > 0 && (
                  <Typography variant="body2">
                    <strong>Precautionary Statements:</strong>
                    <ul style={{ paddingLeft: '20px', marginTop: '4px' }}>
                      {precautionaryStatements.map((statement, idx) => (
                        <li key={idx}>{statement}</li>
                      ))}
                    </ul>
                  </Typography>
                )}
                
                <Typography variant="body2" sx={{ mt: 2 }}>
                  <strong>Signal Word:</strong> {sdsData?.ghs_data?.signal_word || 'Not specified'}
                </Typography>
                
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Hazard Type:</strong>
                  </Typography>
                  <ul style={{ paddingLeft: '20px', marginTop: '4px' }}>
                    {sdsData?.ghs_data?.flammable && <li>Flammable</li>}
                    {sdsData?.ghs_data?.toxic && <li>Toxic</li>}
                    {sdsData?.ghs_data?.corrosive && <li>Corrosive</li>}
                  </ul>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
      
      <Typography variant="body2" color="textSecondary">
        Last updated: {formatDate(sdsData?.sds_files?.[0]?.date_added || sdsData?.classified_at)}
      </Typography>
    </Box>
  );
};

export default SDSViewer;
