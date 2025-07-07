import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Paper, Grid, Card, CardContent, Button, CircularProgress, Alert, IconButton, Stack, TextField, Chip, Autocomplete, Checkbox, FormControlLabel, Snackbar } from '@mui/material';
import { GetApp as GetAppIcon, Error as ErrorIcon, CheckCircle as CheckCircleIcon, ZoomIn, ZoomOut, Fullscreen, FullscreenExit, FileOpen, Download } from '@mui/icons-material';
import { sdsService } from '../services/sdsService';
import { chemicalService } from '../services/chemicalService';
import MuiAlert from '@mui/material/Alert';

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

  // GHS editable state
  const [ghsData, setGhsData] = useState({
    pictograms: [],
    hazard_statements: [],
    precautionary_statements: [],
    signal_word: '',
    flammable: false,
    toxic: false,
    corrosive: false
  });
  const [saveStatus, setSaveStatus] = useState(null);

  // Helper to parse GHS fields
  const parseGhsField = (field) => {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    if (typeof field === 'string') {
      try {
        return JSON.parse(field);
      } catch (e) {
        return field.replace(/[\[\]'"\n]/g, '').split(',').map(item => item.trim()).filter(item => item);
      }
    }
    return [];
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
  
  // When SDS data loads, parse GHS info
  useEffect(() => {
    if (sdsData && (sdsData.ghs_data || sdsData)) {
      const ghs = sdsData.ghs_data || sdsData;
      setGhsData({
        pictograms: parseGhsField(ghs.pictograms),
        hazard_statements: parseGhsField(ghs.hazard_statements),
        precautionary_statements: parseGhsField(ghs.precautionary_statements),
        signal_word: ghs.signal_word || '',
        flammable: !!ghs.flammable,
        toxic: !!ghs.toxic,
        corrosive: !!ghs.corrosive
      });
    }
  }, [sdsData]);

  // Load PDF when SDS data is available
  useEffect(() => {
    if (sdsData && sdsData.file_path) {
      setPdfError(null);
      
      // Create PDF URL with inline disposition parameter
      try {
        const encodedFilePath = encodeURIComponent(sdsData.file_path);
        const pdfFileUrl = `/api/sds/download/${encodedFilePath}?disposition=inline`;
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
  
  // Handler for GHS field changes
  const handleGhsChange = (field, value) => {
    setGhsData(prev => ({ ...prev, [field]: value }));
  };

  // Save handler (stub)
  const saveGhsData = async () => {
    // TODO: Replace with real API call
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 2000);
    }, 1000);
    // Example: await sdsService.updateGhsInfo(casNumber, ghsData);
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
    
    try {
      console.log('Downloading SDS with file path:', sdsData.file_path);
      setDownloadStatus('downloading');
      const encodedFilePath = encodeURIComponent(sdsData.file_path);
      // Use attachment disposition for download
      const downloadUrl = `/api/sds/download/${encodedFilePath}?disposition=attachment`;
      
      // Open the download URL in a new tab
      window.open(downloadUrl, '_blank');
      
      setTimeout(() => {
        setDownloadStatus('success');
        // Clear success message after 3 seconds
        setTimeout(() => setDownloadStatus(null), 3000);
      }, 1000);
      
    } catch (err) {
      console.error('Error downloading SDS:', err);
      setDownloadStatus('error');
      // Clear error message after 3 seconds
      setTimeout(() => setDownloadStatus(null), 3000);
    }
  };

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
      
      <Paper sx={{ p: 3, mb: 3, width: '100%' }}>
        {/* PDF Viewer Section */}
        <Box sx={{ width: '100%' }}>
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
            overflow: 'hidden',
            width: '100%'
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
                height: isFullscreen ? 'calc(100vh - 300px)' : 788,
                border: '1px solid #eee',
                overflow: 'hidden',
                position: 'relative',
                padding: 0,
                transition: 'height 0.3s ease',
                width: '100%'
              }}>
                {/* Main PDF Viewer */}
                <iframe
                  title={`SDS Document for ${chemicalData?.name || casNumber}`}
                  src={`http://ekmbalps1.corp.eikontx.com:6443/api/sds/download/${encodeURIComponent(sdsData.file_path)}?disposition=inline#zoom=100`}
                  width="100%"
                  height="100%"
                  style={{ border: 'none' }}
                  allow="fullscreen"
                ></iframe>
                {/* Controls overlay */}
                <Box sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  bgcolor: 'rgba(255,255,255,0.9)',
                  p: 1,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid #eee'
                }}>
                  <Typography variant="body2" sx={{ ml: 1, fontWeight: 500 }}>
                    {chemicalData?.name || casNumber}
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => setIsFullscreen(!isFullscreen)}
                      title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                    >
                      {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
                    </IconButton>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Download />}
                      onClick={downloadSds}
                      disabled={downloadStatus === 'downloading'}
                    >
                      {downloadStatus === 'downloading' ? 'Downloading...' : 'Download'}
                    </Button>
                  </Stack>
                </Box>
              </Box>
            ) : (
              <Box sx={{
                height: 450,
                bgcolor: '#f5f5f5',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: 1,
                width: '100%'
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
        </Box>
        {/* GHS Info Section (editable) */}
        <Box sx={{ width: '100%', mt: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                GHS Information (Editable)
              </Typography>
              <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={ghsData.pictograms}
                onChange={(_, value) => handleGhsChange('pictograms', value)}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip variant="outlined" label={option} {...getTagProps({ index })} key={option} />
                  ))
                }
                renderInput={(params) => (
                  <TextField {...params} variant="outlined" label="Pictograms" placeholder="Add pictogram" sx={{ mb: 2 }} />
                )}
              />
              <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={ghsData.hazard_statements}
                onChange={(_, value) => handleGhsChange('hazard_statements', value)}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip variant="outlined" label={option} {...getTagProps({ index })} key={option} />
                  ))
                }
                renderInput={(params) => (
                  <TextField {...params} variant="outlined" label="Hazard Statements" placeholder="Add hazard statement" sx={{ mb: 2 }} />
                )}
              />
              <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={ghsData.precautionary_statements}
                onChange={(_, value) => handleGhsChange('precautionary_statements', value)}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip variant="outlined" label={option} {...getTagProps({ index })} key={option} />
                  ))
                }
                renderInput={(params) => (
                  <TextField {...params} variant="outlined" label="Precautionary Statements" placeholder="Add precautionary statement" sx={{ mb: 2 }} />
                )}
              />
              <TextField
                label="Signal Word"
                variant="outlined"
                value={ghsData.signal_word}
                onChange={e => handleGhsChange('signal_word', e.target.value)}
                sx={{ mb: 2, width: '100%' }}
              />
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <FormControlLabel
                  control={<Checkbox checked={ghsData.flammable} onChange={e => handleGhsChange('flammable', e.target.checked)} />}
                  label="Flammable"
                />
                <FormControlLabel
                  control={<Checkbox checked={ghsData.toxic} onChange={e => handleGhsChange('toxic', e.target.checked)} />}
                  label="Toxic"
                />
                <FormControlLabel
                  control={<Checkbox checked={ghsData.corrosive} onChange={e => handleGhsChange('corrosive', e.target.checked)} />}
                  label="Corrosive"
                />
              </Box>
              <Button variant="contained" color="primary" onClick={saveGhsData} disabled={saveStatus === 'saving'}>
                {saveStatus === 'saving' ? 'Saving...' : 'Save GHS Info'}
              </Button>
              <Snackbar open={saveStatus === 'success'} autoHideDuration={2000} onClose={() => setSaveStatus(null)}>
                <MuiAlert elevation={6} variant="filled" severity="success">GHS info saved!</MuiAlert>
              </Snackbar>
            </CardContent>
          </Card>
        </Box>
      </Paper>
      
      <Typography variant="body2" color="textSecondary">
        Last updated: {formatDate(sdsData?.sds_files?.[0]?.date_added || sdsData?.classified_at)}
      </Typography>
    </Box>
  );
};

export default SDSViewer;
