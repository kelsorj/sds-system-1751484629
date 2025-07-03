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
      // In a real app, you would fetch this data from your backend
      // Here we're simulating it for demonstration
      // const response = await sdsService.getAllSdsInfo();
      // setSdsDocuments(response.data);
      
      // Simulate API delay and data
      setTimeout(() => {
        const mockSdsDocuments = [
          { 
            cas_number: '67-64-1', 
            chemical_name: 'Acetone', 
            sds_files: [{ id: 1, filename: 'acetone_sds_2024.pdf', source: 'Fisher', date_added: '2024-04-15' }],
            ghs_data: {
              pictograms: ['GHS02', 'GHS07'],
              hazard_statements: ['H225', 'H319', 'H336'],
              precautionary_statements: ['P210', 'P233', 'P261', 'P280']
            }
          },
          { 
            cas_number: '64-17-5', 
            chemical_name: 'Ethanol', 
            sds_files: [{ id: 2, filename: 'ethanol_sds_2023.pdf', source: 'Sigma', date_added: '2023-11-22' }],
            ghs_data: {
              pictograms: ['GHS02'],
              hazard_statements: ['H225'],
              precautionary_statements: ['P210', 'P233']
            }
          },
          { 
            cas_number: '75-09-2', 
            chemical_name: 'Dichloromethane', 
            sds_files: [{ id: 3, filename: 'dcm_sds_2024.pdf', source: 'VWR', date_added: '2024-01-30' }],
            ghs_data: {
              pictograms: ['GHS08'],
              hazard_statements: ['H351'],
              precautionary_statements: ['P201', 'P202', 'P280']
            }
          },
          { 
            cas_number: '67-68-5', 
            chemical_name: 'Dimethyl sulfoxide', 
            sds_files: [{ id: 4, filename: 'dmso_sds_2023.pdf', source: 'Fisher', date_added: '2023-10-12' }],
            ghs_data: {
              pictograms: [],
              hazard_statements: [],
              precautionary_statements: ['P261']
            }
          },
          { 
            cas_number: '67-56-1', 
            chemical_name: 'Methanol', 
            sds_files: [{ id: 5, filename: 'methanol_sds_2024.pdf', source: 'Sigma', date_added: '2024-02-18' }],
            ghs_data: {
              pictograms: ['GHS02', 'GHS06', 'GHS08'],
              hazard_statements: ['H225', 'H301', 'H311', 'H331', 'H370'],
              precautionary_statements: ['P210', 'P233', 'P260', 'P280']
            }
          },
          { 
            cas_number: '108-88-3', 
            chemical_name: 'Toluene', 
            sds_files: [{ id: 6, filename: 'toluene_sds_2023.pdf', source: 'ChemSupply', date_added: '2023-09-05' }],
            ghs_data: {
              pictograms: ['GHS02', 'GHS07', 'GHS08'],
              hazard_statements: ['H225', 'H304', 'H315', 'H336', 'H361', 'H373'],
              precautionary_statements: ['P210', 'P240', 'P301+P310', 'P403+P233']
            }
          },
          { 
            cas_number: '108-95-2', 
            chemical_name: 'Phenol', 
            sds_files: [{ id: 7, filename: 'phenol_sds_2023.pdf', source: 'Sigma', date_added: '2023-12-01' }],
            ghs_data: {
              pictograms: ['GHS05', 'GHS06', 'GHS08'],
              hazard_statements: ['H301', 'H311', 'H331', 'H314', 'H341', 'H373'],
              precautionary_statements: ['P260', 'P280', 'P301+P310', 'P303+P361+P353']
            }
          },
        ];
        setSdsDocuments(mockSdsDocuments);
        setLoading(false);
      }, 1000);
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

  const downloadSds = async (casNumber, fileName) => {
    try {
      // In a real app, you would call the API to download the SDS
      // const blob = await sdsService.downloadSds(casNumber);
      // const url = window.URL.createObjectURL(blob);
      // const a = document.createElement('a');
      // a.href = url;
      // a.download = fileName;
      // document.body.appendChild(a);
      // a.click();
      // a.remove();
      
      alert(`Downloading SDS file: ${fileName}`);
    } catch (error) {
      console.error('Error downloading SDS:', error);
      alert('Failed to download SDS. Please try again.');
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

  // Helper function to render GHS pictograms
  const renderGhsPictograms = (pictograms) => {
    if (!pictograms || pictograms.length === 0) return 'None';
    
    return (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {pictograms.map((pictogram, index) => (
          <Chip 
            key={index} 
            label={pictogram} 
            size="small" 
            color="warning"
            sx={{ fontWeight: 'bold' }}
          />
        ))}
      </Box>
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
                    <TableCell>SDS Document</TableCell>
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
                                  <Tooltip title="Download">
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={() => downloadSds(doc.cas_number, file.filename)}
                                    >
                                      <GetAppIcon fontSize="small" />
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
                          {renderGhsPictograms(doc.ghs_data?.pictograms)}
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
