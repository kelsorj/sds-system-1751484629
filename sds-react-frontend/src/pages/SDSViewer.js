import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Paper, Grid, Card, CardContent, Button, CircularProgress, Alert, IconButton, Stack, TextField, Chip, Autocomplete, Checkbox, FormControlLabel, Snackbar } from '@mui/material';
import { GetApp as GetAppIcon, Error as ErrorIcon, CheckCircle as CheckCircleIcon, ZoomIn, ZoomOut, Fullscreen, FullscreenExit, FileOpen, Download } from '@mui/icons-material';
import { sdsService } from '../services/sdsService';
import { chemicalService } from '../services/chemicalService';
import MuiAlert from '@mui/material/Alert';
import { GhsPictogramDisplay } from '../components/GhsPictogramDisplay';
import { CombinedPictogramDisplay } from '../components/CombinedPictogramDisplay';
import { getAvailablePictograms } from '../utils/ghsPictogramMapping';

const SDSViewer = () => {
  const { casNumber } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chemicalData, setChemicalData] = useState(null);
  const [sdsData, setSdsData] = useState(null);
  const [downloadStatus, setDownloadStatus] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parseSuccess, setParseSuccess] = useState(false);
  const [parseError, setParseError] = useState(null);
  
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
        console.log('Fetching data for CAS:', casNumber);
        
        // Fetch chemical details first
        let chemicalData = null;
        try {
          chemicalData = await chemicalService.getChemical(casNumber);
          console.log('Chemical data fetched:', chemicalData);
          setChemicalData(chemicalData);
        } catch (chemErr) {
          console.error('Error fetching chemical data:', chemErr);
          // Continue even if chemical data fails - we might still have SDS data
        }
        
        // Try to fetch SDS data using the more direct approach first
        let sdsData = null;
        try {
          sdsData = await sdsService.getSdsInfo(casNumber);
          console.log('SDS data fetched directly:', sdsData);
          if (sdsData) {
            setSdsData(sdsData);
          }
        } catch (directSdsErr) {
          console.log('Direct SDS fetch failed, trying list approach:', directSdsErr.message);
          
          // Fallback: fetch all SDS files and find matching one
          try {
            const sdsResponse = await sdsService.getSdsFiles();
            console.log('All SDS files response:', sdsResponse);
            
            if (sdsResponse && sdsResponse.data && Array.isArray(sdsResponse.data)) {
              const matchingSds = sdsResponse.data.find(sds => sds.cas_number === casNumber);
              if (matchingSds) {
                console.log('Found matching SDS in list:', matchingSds);
                setSdsData(matchingSds);
                sdsData = matchingSds;
              }
            }
          } catch (listSdsErr) {
            console.error('Error fetching SDS list:', listSdsErr);
          }
        }
        
        // If we have neither chemical nor SDS data, show an error
        if (!chemicalData && !sdsData) {
          setError('No data found for this chemical. The CAS number may not exist in the system.');
        } else if (!sdsData) {
          // We have chemical data but no SDS
          console.log('Chemical found but no SDS document available');
          // Don't set this as an error - just show the chemical data without SDS
        }
        
      } catch (err) {
        console.error('Unexpected error in fetchData:', err);
        setError(`Failed to load data: ${err.message}`);
      } finally {
        console.log('Setting loading to false');
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

  // Helper function to parse array data from various formats
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
    try {
      setSaveStatus('saving');
      await sdsService.updateGhsInfo(casNumber, ghsData);
      setSaveStatus('success');
      
      // Refresh the GHS data to show updated values
      try {
        const ghsResponse = await sdsService.getGhsData(casNumber);
        if (ghsResponse && ghsResponse.ghs_classifications && ghsResponse.ghs_classifications.length > 0) {
          const latestGhs = ghsResponse.ghs_classifications[0]; // Get the most recent classification
          // Update the sdsData with the new GHS information
          setSdsData(prevData => ({
            ...prevData,
            ghs_data: latestGhs
          }));
        }
      } catch (refreshErr) {
        console.error('Error refreshing GHS data after save:', refreshErr);
      }
      
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (error) {
      console.error('Error saving GHS data:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    }
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
      
      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = ''; // This will use the filename from Content-Disposition header
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
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

  // Function to parse the PDF and extract GHS information
  const parsePDF = async () => {
    try {
      setParsing(true);
      setParseError(null);
      setParseSuccess(false);
      setSaveStatus(null);
      
      if (!sdsData || !sdsData.file_path || !sdsData.cas_number) {
        throw new Error('SDS data is missing required information');
      }
      
      const result = await sdsService.extractGhsFromPdf(sdsData.cas_number, sdsData.file_path);
      
      if (result.success) {
        setParseSuccess(true);
        setSaveStatus('success');
        
        // Update local data with the new GHS information
        if (result.chemical) {
          setChemicalData(prev => ({
            ...prev,
            ...result.chemical
          }));
        }
        
        if (result.ghs_info) {
          setGhsData({
            pictograms: parseGhsField(result.chemical?.ghs_pictograms || result.ghs_info.pictograms),
            hazard_statements: parseGhsField(result.chemical?.hazard_statement || result.ghs_info.hazard_statements),
            precautionary_statements: parseGhsField(result.chemical?.precautionary_statement || result.ghs_info.precautionary_statements),
            signal_word: result.chemical?.signal_word || result.ghs_info.signal_word || '',
            flammable: result.ghs_info.flammable || false,
            toxic: result.ghs_info.toxic || false,
            corrosive: result.ghs_info.corrosive || false
          });
        }
      } else {
        setParseError(result.error || "Failed to parse PDF");
        setSaveStatus('error');
      }
    } catch (err) {
      console.error("Error parsing PDF:", err);
      setParseError(err.message || "Failed to parse PDF");
      setSaveStatus('error');
    } finally {
      setParsing(false);
      
      // Auto-hide success message after 5 seconds
      if (saveStatus === 'success') {
        setTimeout(() => setSaveStatus(null), 5000);
      }
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
                    <Button 
                      variant="contained" 
                      color="success" 
                      size="small"
                      onClick={parsePDF} 
                      disabled={parsing || !sdsData?.file_path}
                      startIcon={parsing ? <CircularProgress size={16} color="inherit" /> : null}
                    >
                      {parsing ? "Parsing PDF..." : "Extract GHS Data"}
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
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Pictograms
                </Typography>
                <CombinedPictogramDisplay 
                  ghsPictograms={ghsData.pictograms}
                  hazardStatements={ghsData.hazard_statements}
                  onPictogramDelete={(index) => {
                    const newPictograms = [...ghsData.pictograms];
                    newPictograms.splice(index, 1);
                    handleGhsChange('pictograms', newPictograms);
                  }}
                  size="medium"
                  showSource={true}
                  showLabels={false}
                />
                <Autocomplete
                  multiple
                  freeSolo
                  options={getAvailablePictograms().map(p => p.code)}
                  value={ghsData.pictograms}
                  onChange={(_, value) => handleGhsChange('pictograms', value)}
                  renderInput={(params) => (
                    <TextField {...params} variant="outlined" label="Add/Edit Pictograms" placeholder="Type or select pictogram codes" size="small" sx={{ mt: 1 }} />
                  )}
                />
              </Box>
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
              {/* Boolean hazard flags */}
              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Hazard Classifications</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                <FormControlLabel
                  control={<Checkbox checked={ghsData.flammable} onChange={e => handleGhsChange('flammable', e.target.checked)} />}
                  label="Flammable"
                />
                <FormControlLabel
                  control={<Checkbox checked={ghsData.explosive} onChange={e => handleGhsChange('explosive', e.target.checked)} />}
                  label="Explosive"
                />
                <FormControlLabel
                  control={<Checkbox checked={ghsData.oxidizing} onChange={e => handleGhsChange('oxidizing', e.target.checked)} />}
                  label="Oxidizing"
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
              
              {/* Text fields for specific toxicity types */}
              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Specific Toxicity Information</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2, mb: 2 }}>
                <TextField
                  label="Acute Toxicity"
                  variant="outlined"
                  value={ghsData.acute_toxicity || ''}
                  onChange={e => handleGhsChange('acute_toxicity', e.target.value)}
                  placeholder="e.g., Category 4, Oral"
                />
                <TextField
                  label="Serious Eye Damage"
                  variant="outlined"
                  value={ghsData.serious_eye_damage || ''}
                  onChange={e => handleGhsChange('serious_eye_damage', e.target.value)}
                  placeholder="e.g., Category 1"
                />
                <TextField
                  label="Skin Corrosion"
                  variant="outlined"
                  value={ghsData.skin_corrosion || ''}
                  onChange={e => handleGhsChange('skin_corrosion', e.target.value)}
                  placeholder="e.g., Category 1B"
                />
                <TextField
                  label="Reproductive Toxicity"
                  variant="outlined"
                  value={ghsData.reproductive_toxicity || ''}
                  onChange={e => handleGhsChange('reproductive_toxicity', e.target.value)}
                  placeholder="e.g., Category 1A"
                />
                <TextField
                  label="Carcinogenicity"
                  variant="outlined"
                  value={ghsData.carcinogenicity || ''}
                  onChange={e => handleGhsChange('carcinogenicity', e.target.value)}
                  placeholder="e.g., Category 1A"
                />
                <TextField
                  label="Germ Cell Mutagenicity"
                  variant="outlined"
                  value={ghsData.germ_cell_mutagenicity || ''}
                  onChange={e => handleGhsChange('germ_cell_mutagenicity', e.target.value)}
                  placeholder="e.g., Category 1B"
                />
                <TextField
                  label="Respiratory Sensitization"
                  variant="outlined"
                  value={ghsData.respiratory_sensitization || ''}
                  onChange={e => handleGhsChange('respiratory_sensitization', e.target.value)}
                  placeholder="e.g., Category 1"
                />
                <TextField
                  label="Aquatic Toxicity"
                  variant="outlined"
                  value={ghsData.aquatic_toxicity || ''}
                  onChange={e => handleGhsChange('aquatic_toxicity', e.target.value)}
                  placeholder="e.g., Acute Category 1"
                />
              </Box>
              
              {/* Hazard Classes array field */}
              <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={ghsData.hazard_classes || []}
                onChange={(_, value) => handleGhsChange('hazard_classes', value)}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip variant="outlined" label={option} {...getTagProps({ index })} key={option} />
                  ))
                }
                renderInput={(params) => (
                  <TextField {...params} variant="outlined" label="Hazard Classes" placeholder="Add hazard class" sx={{ mb: 2 }} />
                )}
              />
              <Button variant="contained" color="primary" onClick={saveGhsData} disabled={saveStatus === 'saving'}>
                {saveStatus === 'saving' ? 'Saving...' : 'Save GHS Info'}
              </Button>
              <Snackbar open={saveStatus === 'success'} autoHideDuration={2000} onClose={() => setSaveStatus(null)}>
                <MuiAlert elevation={6} variant="filled" severity="success">GHS info saved!</MuiAlert>
              </Snackbar>
              <Snackbar open={saveStatus === 'error'} autoHideDuration={3000} onClose={() => setSaveStatus(null)}>
                <MuiAlert elevation={6} variant="filled" severity="error">Error saving GHS info!</MuiAlert>
              </Snackbar>
              <Snackbar open={parseError} autoHideDuration={2000} onClose={() => setParseError(null)}>
                <MuiAlert elevation={6} variant="filled" severity="error">Error parsing PDF!</MuiAlert>
              </Snackbar>
              <Snackbar open={parseSuccess} autoHideDuration={2000} onClose={() => setParseSuccess(false)}>
                <MuiAlert elevation={6} variant="filled" severity="success">PDF parsed successfully!</MuiAlert>
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
