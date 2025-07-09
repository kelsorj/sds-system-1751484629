import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  LinearProgress,
  Alert,
  Divider,
  Button
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Description as DescriptionIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import sdsService from '../services/sdsService';

const BulkUpload = () => {
  const [uploadQueue, setUploadQueue] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState([]);

  // Extract CAS number from filename (e.g., "64-17-5.pdf" -> "64-17-5")
  const extractCasFromFilename = (filename) => {
    const match = filename.match(/^(\d+-\d+-\d+)\.pdf$/i);
    return match ? match[1] : null;
  };

  // Validate file format and extract CAS number
  const validateFile = useCallback((file) => {
    if (file.type !== 'application/pdf') {
      return { valid: false, error: 'File must be a PDF' };
    }

    const casNumber = extractCasFromFilename(file.name);
    if (!casNumber) {
      return { 
        valid: false, 
        error: 'Filename must be in format: CAS#.pdf (e.g., 64-17-5.pdf)' 
      };
    }

    return { valid: true, casNumber };
  }, []);

  // Handle file drop
  const onDrop = useCallback((acceptedFiles) => {
    const newFiles = acceptedFiles.map(file => {
      const validation = validateFile(file);
      return {
        id: Math.random().toString(36).substr(2, 9),
        file,
        casNumber: validation.casNumber,
        status: validation.valid ? 'pending' : 'invalid',
        error: validation.error,
        progress: 0
      };
    });

    setUploadQueue(prev => [...prev, ...newFiles]);
  }, [validateFile]);

  // Remove file from queue
  const removeFile = (fileId) => {
    setUploadQueue(prev => prev.filter(item => item.id !== fileId));
  };

  // Clear all files
  const clearQueue = () => {
    setUploadQueue([]);
    setResults([]);
  };

  // Process single file upload
  const processFile = async (fileItem) => {
    try {
      // Update status to uploading
      setUploadQueue(prev => prev.map(item => 
        item.id === fileItem.id 
          ? { ...item, status: 'uploading', progress: 10 }
          : item
      ));

      // Check if CAS number already has an SDS
      const existingData = await sdsService.getSdsData(fileItem.casNumber);
      
      if (existingData && existingData.sds_files && existingData.sds_files.length > 0) {
        // CAS already has SDS - skip upload
        setUploadQueue(prev => prev.map(item => 
          item.id === fileItem.id 
            ? { 
                ...item, 
                status: 'skipped', 
                progress: 100,
                error: 'SDS already exists for this CAS number'
              }
            : item
        ));
        return { status: 'skipped', casNumber: fileItem.casNumber, message: 'Already exists' };
      }

      // Update progress
      setUploadQueue(prev => prev.map(item => 
        item.id === fileItem.id 
          ? { ...item, progress: 30 }
          : item
      ));

      // Upload the file (GHS parsing happens automatically in the background)
      const formData = new FormData();
      formData.append('file', fileItem.file);
      formData.append('cas_number', fileItem.casNumber);

      const uploadResult = await sdsService.uploadSds(formData);

      // Update final status
      setUploadQueue(prev => prev.map(item => 
        item.id === fileItem.id 
          ? { 
              ...item, 
              status: 'completed', 
              progress: 100,
              uploadResult: uploadResult
            }
          : item
      ));

      return { 
        status: 'completed', 
        casNumber: fileItem.casNumber, 
        message: 'Uploaded successfully (GHS parsing in progress)',
        uploadResult
      };

    } catch (error) {
      console.error('Error processing file:', error);
      
      setUploadQueue(prev => prev.map(item => 
        item.id === fileItem.id 
          ? { 
              ...item, 
              status: 'error', 
              progress: 0,
              error: error.message || 'Upload failed'
            }
          : item
      ));

      return { 
        status: 'error', 
        casNumber: fileItem.casNumber, 
        message: error.message || 'Upload failed' 
      };
    }
  };

  // Process all valid files in queue
  const processAllFiles = async () => {
    const validFiles = uploadQueue.filter(item => item.status === 'pending');
    
    if (validFiles.length === 0) {
      return;
    }

    setProcessing(true);
    const processResults = [];

    // Process files sequentially to avoid overwhelming the server
    for (const fileItem of validFiles) {
      const result = await processFile(fileItem);
      processResults.push(result);
    }

    setResults(processResults);
    setProcessing(false);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: true
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'skipped':
        return <WarningIcon color="warning" />;
      case 'invalid':
        return <ErrorIcon color="error" />;
      case 'uploading':
        return <CloudUploadIcon color="primary" />;
      default:
        return <DescriptionIcon color="action" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'error':
      case 'invalid':
        return 'error';
      case 'skipped':
        return 'warning';
      case 'uploading':
        return 'primary';
      default:
        return 'default';
    }
  };

  const validFiles = uploadQueue.filter(item => item.status === 'pending').length;
  const totalFiles = uploadQueue.length;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Bulk PDF Upload
      </Typography>
      
      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
        Upload multiple SDS PDF files for batch processing. Files must be named in the format: <strong>CAS#.pdf</strong> (e.g., 64-17-5.pdf)
      </Typography>

      {/* Upload Area */}
      <Paper
        {...getRootProps()}
        sx={{
          p: 4,
          mb: 3,
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.300',
          bgcolor: isDragActive ? 'action.hover' : 'background.paper',
          cursor: 'pointer',
          textAlign: 'center',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'action.hover'
          }
        }}
      >
        <input {...getInputProps()} />
        <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          {isDragActive ? 'Drop PDF files here...' : 'Drag & drop PDF files here'}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          or click to select files
        </Typography>
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
          Files must be named: CAS#.pdf (e.g., 64-17-5.pdf, 67-64-1.pdf)
        </Typography>
      </Paper>

      {/* File Queue */}
      {uploadQueue.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Upload Queue ({totalFiles} files)
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  onClick={processAllFiles}
                  disabled={processing || validFiles === 0}
                  startIcon={<CloudUploadIcon />}
                >
                  {processing ? 'Processing...' : `Upload ${validFiles} Files`}
                </Button>
                <Button
                  variant="outlined"
                  onClick={clearQueue}
                  disabled={processing}
                  startIcon={<DeleteIcon />}
                >
                  Clear All
                </Button>
              </Box>
            </Box>

            <List>
              {uploadQueue.map((item, index) => (
                <React.Fragment key={item.id}>
                  <ListItem>
                    <ListItemIcon>
                      {getStatusIcon(item.status)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1">
                            {item.file.name}
                          </Typography>
                          <Chip 
                            label={item.casNumber || 'Invalid'} 
                            size="small" 
                            color={item.casNumber ? 'primary' : 'error'}
                          />
                          <Chip 
                            label={item.status} 
                            size="small" 
                            color={getStatusColor(item.status)}
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          {item.error && (
                            <Box component="div" sx={{ color: 'error.main', fontSize: '0.875rem', mt: 0.5 }}>
                              {item.error}
                            </Box>
                          )}
                          {item.status === 'uploading' && (
                            <LinearProgress 
                              variant="determinate" 
                              value={item.progress} 
                              sx={{ mt: 1 }}
                            />
                          )}
                        </Box>
                      }
                    />
                    {item.status === 'pending' && (
                      <Button
                        size="small"
                        onClick={() => removeFile(item.id)}
                        disabled={processing}
                      >
                        Remove
                      </Button>
                    )}
                  </ListItem>
                  {index < uploadQueue.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Results Summary */}
      {results.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Processing Results
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Chip 
                label={`${results.filter(r => r.status === 'completed').length} Completed`}
                color="success"
              />
              <Chip 
                label={`${results.filter(r => r.status === 'skipped').length} Skipped`}
                color="warning"
              />
              <Chip 
                label={`${results.filter(r => r.status === 'error').length} Failed`}
                color="error"
              />
            </Box>

            {results.filter(r => r.status === 'skipped').length > 0 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Some files were skipped because SDS documents already exist for those CAS numbers.
              </Alert>
            )}

            {results.filter(r => r.status === 'error').length > 0 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Some files failed to upload. Check the individual file status above for details.
              </Alert>
            )}

            {results.filter(r => r.status === 'completed').length > 0 && (
              <Alert severity="success">
                Successfully uploaded and parsed {results.filter(r => r.status === 'completed').length} new SDS documents.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default BulkUpload;
