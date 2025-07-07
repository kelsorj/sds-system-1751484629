import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
// Using direct rendering approach instead of separate RDKit loader
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  FormControlLabel,
  IconButton,
  LinearProgress,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Article as ArticleIcon,
  GetApp as GetAppIcon,
  Science as ScienceIcon
} from '@mui/icons-material';
import { chemicalService } from '../services/chemicalService';
import { sdsService } from '../services/sdsService';
import MoleculeViewer from '../components/MoleculeViewer';

const ChemicalList = () => {
  const [chemicals, setChemicals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderBy, setOrderBy] = useState('name');
  const [order, setOrder] = useState('asc');
  const [showStructures, setShowStructures] = useState(false);
  
  useEffect(() => {
    fetchChemicals();
  }, []);

  const fetchChemicals = async () => {
    try {
      setLoading(true);
      // Fetch real data from the backend
      const response = await chemicalService.getChemicals();
      console.log('Fetched chemicals from API:', response.data);
      
      // Enhanced logging for SMILES data debugging
      console.log('=== CHEMICAL DATA DEBUGGING ===');
      response.data.forEach((chemical, index) => {
        console.log(`Chemical ${index + 1} (${chemical.cas_number}):`, {
          name: chemical.name,
          cas_number: chemical.cas_number,
          smiles: chemical.smiles,
          smiles_type: typeof chemical.smiles,
          smiles_length: chemical.smiles ? chemical.smiles.length : 0,
          has_sds: chemical.has_sds
        });
      });
      console.log('=== END CHEMICAL DATA DEBUGGING ===');
      
      // The API now provides has_sds property directly
      console.log('First chemical has_sds:', response.data[0]?.has_sds);
      setChemicals(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching chemicals:', error);
      setLoading(false);
    }
  };

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
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

  const downloadSds = async (chemical) => {
    try {
      if (!chemical.file_path) {
        alert(`No SDS file available for ${chemical.name}`);
        return;
      }
      
      // Download SDS file using the file path from the API
      const apiUrl = `${process.env.REACT_APP_API_URL || 'http://ekmbalps1.corp.eikontx.com:6443/api'}`;
      const sdsUrl = `${apiUrl}/sds/download/${encodeURIComponent(chemical.file_path)}`;
      
      // Open the SDS file in a new tab
      window.open(sdsUrl, '_blank');
    } catch (error) {
      console.error('Error downloading SDS:', error);
      alert('Failed to download SDS. Please try again.');
    }
  };



  // Filter and sort chemicals
  const filteredChemicals = chemicals
    .filter((chemical) => {
      if (!searchQuery) return true;
      
      const query = searchQuery.toLowerCase();
      return (
        chemical.name.toLowerCase().includes(query) ||
        chemical.cas_number.includes(query) ||
        chemical.molecular_formula.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      const isAsc = order === 'asc';
      if (orderBy === 'name') {
        return isAsc 
          ? a.name.localeCompare(b.name) 
          : b.name.localeCompare(a.name);
      }
      if (orderBy === 'cas_number') {
        return isAsc 
          ? a.cas_number.localeCompare(b.cas_number) 
          : b.cas_number.localeCompare(a.cas_number);
      }
      if (orderBy === 'molecular_formula') {
        return isAsc 
          ? a.molecular_formula.localeCompare(b.molecular_formula) 
          : b.molecular_formula.localeCompare(a.molecular_formula);
      }
      if (orderBy === 'quantity') {
        return isAsc 
          ? a.quantity - b.quantity 
          : b.quantity - a.quantity;
      }
      return 0;
    });

  const paginatedChemicals = filteredChemicals.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Highly visible component to display SMILES codes (impossible to miss)
  const SmilesStructure = ({ smiles, id }) => {
    // Using extremely high contrast colors to ensure visibility
    console.log(`Rendering SmilesStructure for ${id} with SMILES: ${smiles}`);
    
    return (
      <Box 
        width={150} 
        height={100} 
        display="flex" 
        alignItems="center" 
        justifyContent="center" 
        bgcolor="#ff0000" // Bright red background
        border="3px solid #000000" // Thick black border
        borderRadius={2}
        boxShadow="0 4px 8px rgba(0,0,0,0.5)"
        overflow="hidden"
        position="relative"
        style={{ margin: '10px 0' }} // Add extra margin to make it stand out
      >
        <Box 
          display="flex" 
          flexDirection="column" 
          alignItems="center" 
          justifyContent="center"
          p={1} 
          width="100%"
          height="100%"
          bgcolor="#ffff00" // Bright yellow inner box
          border="2px dashed #000000" // Dashed border for contrast
        >
          <Typography 
            variant="subtitle2" 
            sx={{ 
              color: '#000000', 
              fontWeight: 'bold',
              fontSize: '14px',
              mb: 1,
              textTransform: 'uppercase',
              textAlign: 'center'
            }}
          >
            SMILES
          </Typography>
          
          <Typography 
            variant="body2" 
            sx={{ 
              fontSize: '12px',
              fontWeight: 'bold',
              backgroundColor: '#ffffff',
              padding: '4px 8px',
              borderRadius: '4px',
              border: '1px solid #000000',
              width: '90%',
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {smiles || 'N/A'}
          </Typography>
          
          <Typography 
            variant="caption"
            sx={{ 
              position: 'absolute',
              bottom: '5px',
              right: '5px',
              fontSize: '10px',
              fontWeight: 'bold',
              color: '#000000',
              backgroundColor: '#ffffff',
              padding: '2px 4px',
              borderRadius: '2px'
            }}
          >
            ID: {id}
          </Typography>
        </Box>
      </Box>
    );
  };

  return (
    <Box>
      {/* No informational message anymore */}
      
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Chemical Inventory</Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <FormControlLabel
            control={
              <Switch 
                checked={showStructures} 
                onChange={(e) => setShowStructures(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Box display="flex" alignItems="center">
                <ScienceIcon fontSize="small" sx={{ mr: 0.5 }} />
                <Typography variant="body2">Show Structures</Typography>
              </Box>
            }
            sx={{ mr: 1 }}
          />
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            component={Link}
            to="/chemicals/add"
          >
            Add Chemical
          </Button>
        </Box>
      </Box>

      {/* Search and filter */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center">
            <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
            <TextField
              fullWidth
              label="Search chemicals"
              variant="outlined"
              placeholder="Search by name, CAS number, or formula"
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
              <Table aria-label="chemical inventory table">
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'name'}
                        direction={orderBy === 'name' ? order : 'asc'}
                        onClick={() => handleRequestSort('name')}
                      >
                        Name
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'cas_number'}
                        direction={orderBy === 'cas_number' ? order : 'asc'}
                        onClick={() => handleRequestSort('cas_number')}
                      >
                        CAS Number
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'molecular_formula'}
                        direction={orderBy === 'molecular_formula' ? order : 'asc'}
                        onClick={() => handleRequestSort('molecular_formula')}
                      >
                        Formula
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'quantity'}
                        direction={orderBy === 'quantity' ? order : 'asc'}
                        onClick={() => handleRequestSort('quantity')}
                      >
                        Quantity
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Structure</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>SDS</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedChemicals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        No chemicals found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedChemicals.map((chemical, idx) => (
                      <TableRow key={chemical.cas_number}>
                        <TableCell>
                          <Link 
                            to={`/chemicals/${chemical.cas_number}`}
                            style={{ textDecoration: 'none', color: '#1976d2' }}
                          >
                            {chemical.name}
                          </Link>
                        </TableCell>
                        <TableCell>{chemical.cas_number}</TableCell>
                        <TableCell>{chemical.molecular_formula}</TableCell>
                        <TableCell>{`${chemical.quantity} ${chemical.unit}`}</TableCell>
                        <TableCell>
                          {chemical.smiles ? (
                            showStructures ? (
                              <MoleculeViewer 
                                smiles={chemical.smiles} 
                                width={100} 
                                height={80} 
                                compact 
                              />
                            ) : (
                              <Tooltip title={chemical.smiles}>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    maxWidth: 150, 
                                    overflow: 'hidden', 
                                    textOverflow: 'ellipsis', 
                                    whiteSpace: 'nowrap',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {chemical.smiles}
                                </Typography>
                              </Tooltip>
                            )
                          ) : (
                            <Typography color="textSecondary" variant="body2">N/A</Typography>
                          )}
                        </TableCell>
                        <TableCell>{chemical.location || <Typography color="textSecondary" variant="body2">N/A</Typography>}</TableCell>
                        <TableCell>
                          {chemical.has_sds ? (
                            <Tooltip title="Download SDS">
                              <IconButton
                                color="primary"
                                size="small"
                                onClick={() => downloadSds(chemical)}
                              >
                                <GetAppIcon />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <Typography color="error" variant="body2">
                              Missing
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <IconButton 
                              component={Link}
                              to={`/chemicals/${chemical.cas_number}/edit`}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="View SDS">
                            <IconButton 
                              component={Link}
                              to={`/sds/${chemical.cas_number}`}
                            >
                              <ArticleIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton color="error">
                              <DeleteIcon />
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
              count={filteredChemicals.length}
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

export default ChemicalList;
