import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Chip
} from '@mui/material';
import {
  Search as SearchIcon,
  GetApp as GetAppIcon,
  CloudDownload as CloudDownloadIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { sdsService } from '../services/sdsService';
import { GhsPictogramImages } from '../components/GhsPictogramDisplay';
import { CombinedPictogramImages } from '../components/CombinedPictogramDisplay';

// Utility function to safely format dates
const formatDate = (dateString) => {
  if (!dateString) return '-';
  
  try {
    // Try to parse the date string
    const date = new Date(dateString);
    
    // Check if date is valid before calling toISOString
    if (isNaN(date.getTime())) {
      return '-';
    }
    
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.log('Error parsing date:', dateString, error);
    return '-';
  }
};

const SDSDocuments = () => {
  const [sdsDocuments, setSdsDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    fetchSdsDocuments();
  }, []);

  const fetchSdsDocuments = async () => {
    try {
      setLoading(true);
      // Fetch real data from the backend API
      const response = await sdsService.getSdsFiles();
      
      // Format the response data to match the expected structure
      const formattedData = response.data.map(sds => {
        // Process the GHS data if available
        let pictograms = [];
        let hazardStatements = [];
        let precautionaryStatements = [];
        
        // Handle pictograms - might be a string array, JSON string, or null
        if (sds.pictograms) {
          if (typeof sds.pictograms === 'string') {
            try {
              pictograms = JSON.parse(sds.pictograms);
            } catch (e) {
              // If not valid JSON, split by commas (common format)
              pictograms = sds.pictograms.replace(/[\[\]\'"]/g, '').split(',').map(p => p.trim()).filter(p => p);
            }
          } else if (Array.isArray(sds.pictograms)) {
            pictograms = sds.pictograms;
          }
        }
        
        // Handle hazard statements
        if (sds.hazard_statements) {
          if (typeof sds.hazard_statements === 'string') {
            try {
              hazardStatements = JSON.parse(sds.hazard_statements);
            } catch (e) {
              hazardStatements = sds.hazard_statements.replace(/[\[\]\'"]/g, '').split(',').map(h => h.trim()).filter(h => h);
            }
          } else if (Array.isArray(sds.hazard_statements)) {
            hazardStatements = sds.hazard_statements;
          }
        }
        
        // Handle precautionary statements
        if (sds.precautionary_statements) {
          if (typeof sds.precautionary_statements === 'string') {
            try {
              precautionaryStatements = JSON.parse(sds.precautionary_statements);
            } catch (e) {
              precautionaryStatements = sds.precautionary_statements.replace(/[\[\]\'"]/g, '').split(',').map(p => p.trim()).filter(p => p);
            }
          } else if (Array.isArray(sds.precautionary_statements)) {
            precautionaryStatements = sds.precautionary_statements;
          }
        }
        
        return {
          cas_number: sds.cas_number || 'Unknown',
          chemical_name: sds.name || 'Unknown Chemical',
          sds_files: [{ 
            id: sds.id, 
            filename: sds.file_name || `${sds.cas_number}.pdf`, 
            source: sds.source || '-', 
            date_added: formatDate(sds.classified_at || sds.created_at) 
          }],
          file_path: sds.file_path,
          ghs_data: {
            pictograms: pictograms,
            hazard_statements: hazardStatements,
            precautionary_statements: precautionaryStatements,
            signal_word: sds.signal_word || '',
            flammable: sds.flammable || false,
            toxic: sds.toxic || false,
            corrosive: sds.corrosive || false
          }
        };
      });
      
      setSdsDocuments(formattedData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching SDS documents:', error);
      setLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const downloadSds = async (sdsFile) => {
    try {
      // Use the file_path for the download URL
      let filePath;
      
      if (sdsFile.file_path) {
        filePath = sdsFile.file_path;
      } else if (sdsFile.filename) {
        filePath = sdsFile.filename;
      } else {
        // Fallback to using the CAS number to construct a filename
        const casNumber = sdsFile.cas_number || 'unknown';
        filePath = `${casNumber}-SDS.pdf`;
      }
      
      // Encode the file path for the URL
      const encodedFilePath = encodeURIComponent(filePath);
      const url = `/api/sds/download/${encodedFilePath}`;
      
      // Open in a new tab
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error downloading SDS:', error);
      // Handle error appropriately (e.g., show error notification)
    }
  };

  const triggerSdsDownload = async (casNumber) => {
    try {
      // In a real app, you would call the API to trigger an SDS download from sources
      // await sdsService.triggerSdsDownload(casNumber);
      
      alert(`Requesting new SDS download for ${casNumber} from external sources...`);
    } catch (error) {
      console.error('Error triggering SDS download:', error);
      alert('Failed to request SDS download. Please try again.');
    }
  };

  // Filter SDS documents
  const filteredSdsDocuments = sdsDocuments
    .filter((doc) => {
      if (!searchQuery) return true;
      
      const query = searchQuery.toLowerCase();
      return (
        doc.chemical_name.toLowerCase().includes(query) ||
        doc.cas_number.includes(query) ||
        doc.sds_files.some(file => 
          file.filename.toLowerCase().includes(query) ||
          file.source.toLowerCase().includes(query)
        )
      );
    });

  const paginatedSdsDocuments = filteredSdsDocuments.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Helper function to render combined GHS and hazard statement pictograms
  const renderGhsPictograms = (sdsData) => {
    const ghsPictograms = sdsData?.pictograms || [];
    const hazardStatements = sdsData?.hazard_statements || [];
    
    if ((!ghsPictograms || ghsPictograms.length === 0) && 
        (!hazardStatements || hazardStatements.length === 0)) {
      return 'None';
    }
    
    return (
      <CombinedPictogramImages 
        ghsPictograms={ghsPictograms}
        hazardStatements={hazardStatements}
        size={24}
        showTooltips={true}
        maxImages={5}
        showSource={true}
      />
    );
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        SDS Documents
      </Typography>

      {/* Search */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center">
            <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
            <TextField
              fullWidth
              label="Search SDS documents"
              variant="outlined"
              placeholder="Search by chemical name, CAS number, or SDS source"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Results table */}
      <Paper>
        {loading ? (
          <LinearProgress />
        ) : (
          <>
            <TableContainer>
              <Table aria-label="SDS documents table">
                <TableHead>
                  <TableRow>
                    <TableCell>Chemical Name</TableCell>
                    <TableCell>CAS Number</TableCell>
                    <TableCell>SDS Document (Source, Date)</TableCell>
                    <TableCell>GHS Pictograms</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedSdsDocuments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No SDS documents found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedSdsDocuments.map((doc) => (
                      <TableRow key={doc.cas_number}>
                        <TableCell>
                          <Link 
                            to={`/chemicals/${doc.cas_number}`}
                            style={{ textDecoration: 'none', color: '#1976d2' }}
                          >
                            {doc.chemical_name}
                          </Link>
                        </TableCell>
                        <TableCell>{doc.cas_number}</TableCell>
                        <TableCell>
                          {doc.sds_files && doc.sds_files.length > 0 ? (
                            <Box>
                              {doc.sds_files.map((file, index) => (
                                <Box key={file.id} display="flex" alignItems="center" mb={index < doc.sds_files.length - 1 ? 1 : 0}>
                                  <Typography variant="body2" sx={{ mr: 1 }}>
                                    {file.filename} ({file.source}, {file.date_added})
                                  </Typography>
                                  <Tooltip title="Download SDS">
                                    <IconButton 
                                      color="primary" 
                                      onClick={() => downloadSds({
                                        cas_number: doc.cas_number,
                                        filename: doc.sds_files[0].filename,
                                        file_path: doc.file_path
                                      })}
                                      size="small"
                                    >
                                      <GetAppIcon />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              ))}
                            </Box>
                          ) : (
                            <Typography color="error" variant="body2">
                              No SDS files available
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {renderGhsPictograms(doc.ghs_data)}
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="View SDS Details">
                            <IconButton 
                              component={Link}
                              to={`/sds/${doc.cas_number}`}
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Request SDS Download">
                            <IconButton 
                              color="primary"
                              onClick={() => triggerSdsDownload(doc.cas_number)}
                            >
                              <CloudDownloadIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredSdsDocuments.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </>
        )}
      </Paper>
    </Box>
  );
};

export default SDSDocuments;
