import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Divider,
  FormControlLabel,
  Grid,
  LinearProgress,
  Paper,
  Typography
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Description as DescriptionIcon,
  GetApp as GetAppIcon
} from '@mui/icons-material';
import { sdsService } from '../services/sdsService';

const ImportData = () => {
  const [file, setFile] = useState(null);
  const [downloadSds, setDownloadSds] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  
  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && !selectedFile.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      setFile(null);
      return;
    }
    setFile(selectedFile);
    setError(null);
  };

  const handleDownloadSdsChange = (event) => {
    setDownloadSds(event.target.checked);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      setError(null);
      setResult(null);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prevProgress) => {
          const newProgress = prevProgress + 10;
          if (newProgress >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return newProgress;
        });
      }, 500);

      // In a real app, you would call the API to upload the CSV
      // const result = await sdsService.importCsv(file, downloadSds);
      // setResult(result);

      // Simulate API delay
      setTimeout(() => {
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        // Mock successful response
        setResult({
          total_records: 15,
          successful_imports: 13,
          failed_imports: 2,
          sds_downloads: downloadSds ? 10 : 0,
          errors: downloadSds ? [
            'Row 5: SDS download failed - No SDS found for CAS# 123-45-6',
            'Row 12: SDS download failed - Connection timeout'
          ] : []
        });
        
        setUploading(false);
      }, 5000);
    } catch (err) {
      setError(err.message || 'An error occurred during upload');
      setUploading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      // In a real app, you would call the API to get the template
      // const response = await fetch('/api/template');
      // const data = await response.json();
      // const blob = new Blob([data.template], { type: 'text/csv' });
      // const url = window.URL.createObjectURL(blob);
      // const a = document.createElement('a');
      // a.href = url;
      // a.download = 'sds_import_template.csv';
      // document.body.appendChild(a);
      // a.click();
      // a.remove();

      // For demo purposes, just create a simple CSV
      const template = "REG_FORMATTED_ID,Smiles,Cas#,Chemical Formula,IUPAC Name\nERX-0000306,O=Cc1ccncc1,872-85-5,C6H5NO,isonicotinaldehyde\nERX-0000330,Nc1cccc(c1)-c1ccccc1,2243-47-2,C12H11N,(3-biphenylyl)amine";
      const blob = new Blob([template], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sds_import_template.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error('Error downloading template:', error);
      alert('Failed to download template. Please try again.');
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Import Chemical Data
      </Typography>

      <Grid container spacing={3}>
        {/* Left column - Upload form */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              CSV Upload
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Upload a CSV file containing chemical data. The system will import the chemicals 
              and optionally download SDS documents for each chemical.
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <input
                accept=".csv"
                style={{ display: 'none' }}
                id="csv-file-upload"
                type="file"
                onChange={handleFileChange}
                disabled={uploading}
              />
              <label htmlFor="csv-file-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<CloudUploadIcon />}
                  disabled={uploading}
                >
                  Select CSV File
                </Button>
              </label>
              {file && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Selected: {file.name}
                </Typography>
              )}
            </Box>

            <FormControlLabel
              control={
                <Checkbox
                  checked={downloadSds}
                  onChange={handleDownloadSdsChange}
                  disabled={uploading}
                />
              }
              label="Download SDS documents for chemicals"
            />

            <Box sx={{ mt: 3 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleUpload}
                disabled={!file || uploading}
                startIcon={uploading ? <CircularProgress size={20} /> : null}
              >
                {uploading ? 'Uploading...' : 'Upload and Process'}
              </Button>
              <Button
                variant="text"
                startIcon={<GetAppIcon />}
                onClick={downloadTemplate}
                sx={{ ml: 2 }}
                disabled={uploading}
              >
                Download Template
              </Button>
            </Box>

            {uploading && (
              <Box sx={{ mt: 3 }}>
                <LinearProgress variant="determinate" value={uploadProgress} />
                <Typography variant="body2" color="textSecondary" align="center" sx={{ mt: 1 }}>
                  {uploadProgress}%
                </Typography>
              </Box>
            )}

            {error && (
              <Alert severity="error" sx={{ mt: 3 }}>
                {error}
              </Alert>
            )}
          </Paper>

          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <DescriptionIcon sx={{ mr: 1, color: 'info.main' }} />
                <Typography variant="body1">
                  CSV Format Instructions
                </Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" paragraph>
                Your CSV file should include the following columns:
              </Typography>
              <ul>
                <li>
                  <Typography variant="body2">
                    <strong>REG_FORMATTED_ID</strong>: Compound registration ID
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2">
                    <strong>Smiles</strong>: Chemical structure in SMILES format
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2">
                    <strong>Cas#</strong>: CAS Registry Number (required)
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2">
                    <strong>Chemical Formula</strong>: Molecular formula
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2">
                    <strong>IUPAC Name</strong>: Chemical name (required)
                  </Typography>
                </li>
              </ul>
            </CardContent>
          </Card>
        </Grid>

        {/* Right column - Results */}
        <Grid item xs={12} md={6}>
          {result && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Import Results
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body1">
                  <strong>Total Records:</strong> {result.total_records}
                </Typography>
                <Typography variant="body1" color="success.main">
                  <strong>Successfully Imported:</strong> {result.successful_imports}
                </Typography>
                <Typography variant="body1" color="error.main">
                  <strong>Failed Imports:</strong> {result.failed_imports}
                </Typography>
                <Typography variant="body1" color="info.main">
                  <strong>SDS Downloads:</strong> {result.sds_downloads}
                </Typography>
              </Box>

              {result.errors && result.errors.length > 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Errors
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fff8f8' }}>
                    {result.errors.map((error, index) => (
                      <Typography key={index} variant="body2" color="error" paragraph={index < result.errors.length - 1}>
                        {error}
                      </Typography>
                    ))}
                  </Paper>
                </Box>
              )}
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default ImportData;
