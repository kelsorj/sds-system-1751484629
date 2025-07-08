import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Typography,
  Snackbar,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  CheckCircle as CheckCircleIcon,
  InsertDriveFile as FileIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import api from '../services/api';

const SDSDropZone = ({ casNumber, onFileUploaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadResult, setUploadResult] = useState(null);
  const fileInputRef = useRef(null);

  // Handle drag events
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file) => {
    // Reset states
    setUploadError('');
    setUploadSuccess(false);
    
    // Check file type - only allow PDFs
    if (file.type !== 'application/pdf') {
      setUploadError('Only PDF files are allowed for SDS uploads');
      return;
    }
    
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size exceeds 10MB limit');
      return;
    }
    
    setFile(file);
  };

  const handleUpload = async () => {
    if (!file || !casNumber) return;
    
    try {
      setUploading(true);
      setUploadError('');
      console.log('Starting upload for CAS number:', casNumber);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('cas_number', casNumber);
      formData.append('source', 'manual_upload');
      formData.append('language', 'en');
      
      console.log('Form data prepared with file:', file.name, 'size:', file.size);
      
      // Use multipart/form-data for file uploads
      console.log('Sending request to /sds/upload endpoint');
      const response = await api.post('/sds/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          console.log(`Upload progress: ${percentCompleted}%`);
        },
      });
      
      console.log('SDS file upload response:', response);
      console.log('Response data:', response.data);
      
      setUploadSuccess(true);
      setUploadResult(response.data);
      
      // Notify parent component
      if (onFileUploaded) {
        console.log('Calling onFileUploaded callback with data:', response.data);
        onFileUploaded(response.data);
      }
      
    } catch (error) {
      console.error('Error uploading SDS file:', error);
      console.error('Error details:', error.response?.data || 'No response data');
      setUploadError(
        error.response?.data?.detail || 
        'Failed to upload file. Please try again.'
      );
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setUploadSuccess(false);
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCloseError = () => {
    setUploadError('');
  };

  return (
    <Box sx={{ my: 2 }}>
      <Typography variant="subtitle1" gutterBottom fontWeight="medium">
        SDS Document Upload
      </Typography>
      
      {uploadSuccess ? (
        <Paper 
          elevation={1} 
          sx={{ 
            p: 2, 
            bgcolor: '#e3f2fd',
            border: '1px solid #90caf9'
          }}
        >
          <Box display="flex" alignItems="center" mb={1}>
            <CheckCircleIcon color="success" sx={{ mr: 1 }} />
            <Typography variant="subtitle1">
              SDS file uploaded successfully
            </Typography>
          </Box>
          
          <List dense>
            <ListItem>
              <ListItemIcon>
                <FileIcon />
              </ListItemIcon>
              <ListItemText 
                primary={uploadResult?.file_name}
                secondary={`${Math.round(uploadResult?.file_size / 1024)} KB`}
              />
            </ListItem>
          </List>
          
          <Box display="flex" justifyContent="flex-end">
            <Button 
              size="small" 
              startIcon={<DeleteIcon />}
              onClick={clearFile}
            >
              Upload Another
            </Button>
          </Box>
        </Paper>
      ) : (
        <Paper
          sx={{
            border: '2px dashed',
            borderColor: isDragging ? '#1976d2' : '#ccc',
            borderRadius: 2,
            bgcolor: isDragging ? '#f0f7ff' : '#fafafa',
            p: 3,
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".pdf"
            style={{ display: 'none' }}
          />
          
          <CloudUploadIcon sx={{ fontSize: 40, color: isDragging ? '#1976d2' : '#999', mb: 1 }} />
          
          <Typography variant="h6" gutterBottom>
            {isDragging ? 'Drop your SDS file here' : 'Drag & Drop SDS PDF here'}
          </Typography>
          
          <Typography variant="body2" color="textSecondary" paragraph>
            or click to browse your files
          </Typography>
          
          {file && (
            <Box mt={2} p={1} bgcolor="#e8f5e9" borderRadius={1}>
              <Typography variant="body2" display="flex" alignItems="center">
                <FileIcon fontSize="small" sx={{ mr: 1 }} />
                {file.name} ({Math.round(file.size / 1024)} KB)
              </Typography>
            </Box>
          )}
          
          {file && (
            <Box mt={2} display="flex" justifyContent="center">
              <Button
                variant="contained"
                color="primary"
                onClick={handleUpload}
                disabled={uploading}
                startIcon={uploading ? <CircularProgress size={20} /> : null}
              >
                {uploading ? 'Uploading...' : 'Upload SDS'}
              </Button>
            </Box>
          )}
        </Paper>
      )}
      
      <Snackbar 
        open={!!uploadError} 
        autoHideDuration={6000} 
        onClose={handleCloseError}
      >
        <Alert severity="error" onClose={handleCloseError}>
          {uploadError}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SDSDropZone;
