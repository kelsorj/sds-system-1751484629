import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
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
  GetApp as GetAppIcon
} from '@mui/icons-material';
import { chemicalService } from '../services/chemicalService';
import { sdsService } from '../services/sdsService';

const ChemicalList = () => {
  const [chemicals, setChemicals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderBy, setOrderBy] = useState('name');
  const [order, setOrder] = useState('asc');
  
  useEffect(() => {
    fetchChemicals();
  }, []);

  const fetchChemicals = async () => {
    try {
      setLoading(true);
      // Fetch real data from the backend
      const response = await chemicalService.getChemicals();
      console.log('Fetched chemicals from API:', response.data);
      
      // Log SMILES data for debugging
      response.data.forEach((chemical, index) => {
        console.log(`Chemical ${index + 1}:`, {
          name: chemical.name,
          cas_number: chemical.cas_number,
          smiles: chemical.smiles,
          smiles_type: typeof chemical.smiles,
          smiles_length: chemical.smiles ? chemical.smiles.length : 0
        });
      });
      
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

  // Helper component to render SMILES as a structure using RDKit loaded at runtime from public/rdkit/RDKit_minimal.js
  const SmilesStructure = ({ smiles, id }) => {
    const [svg, setSvg] = useState(null);
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      let cancelled = false;
      setSvg(null);
      setError(false);
      setLoading(true);

      if (!smiles || typeof smiles !== 'string' || smiles.trim() === '') {
        setError(true);
        setLoading(false);
        return;
      }

      function renderWithRDKitInstance(rdkit) {
        console.log('renderWithRDKitInstance', rdkit);
        if (!rdkit || !rdkit.ready) {
          setError(true);
          setLoading(false);
          return;
        }
        rdkit.ready().then(() => {
          if (cancelled) return;
          try {
            const mol = rdkit.get_mol(smiles.trim());
            if (!mol) {
              setError(true);
              setLoading(false);
              return;
            }
            const svgString = mol.get_svg();
            setSvg(svgString);
            setLoading(false);
            mol.delete();
          } catch (e) {
            setError(true);
            setLoading(false);
          }
        });
      }

      function tryRenderWithRDKit() {
        console.log('tryRenderWithRDKit', window.RDKitModule);
        if (window.RDKitModule) {
          if (typeof window.RDKitModule === 'function') {
            window.RDKitModule().then((instance) => {
              console.log('RDKitModule() resolved', instance);
              renderWithRDKitInstance(instance);
            }).catch((e) => {
              console.error('RDKitModule() error', e);
              setError(true);
              setLoading(false);
            });
          } else {
            renderWithRDKitInstance(window.RDKitModule);
          }
        } else {
          setError(true);
          setLoading(false);
        }
      }

      if (window.RDKitModule) {
        tryRenderWithRDKit();
      } else {
        // Dynamically load the script if not already loaded
        const scriptId = 'rdkit-minimal-lib';
        let script = document.getElementById(scriptId);
        if (!script) {
          script = document.createElement('script');
          script.id = scriptId;
          script.src = '/rdkit/RDKit_minimal.js';
          script.async = true;
          script.onload = () => {
            console.log('RDKit_minimal.js loaded');
            tryRenderWithRDKit();
          };
          script.onerror = () => {
            console.error('Failed to load RDKit_minimal.js');
            setError(true);
            setLoading(false);
          };
          document.body.appendChild(script);
        } else {
          script.onload = tryRenderWithRDKit;
        }
      }

      return () => {
        cancelled = true;
      };
    }, [smiles, id]);

    if (loading) {
      return (
        <Box width={120} height={80} display="flex" alignItems="center" justifyContent="center" bgcolor="#f8f9fa" border="1px solid #dee2e6" borderRadius={1}>
          <Typography variant="caption" color="textSecondary">Loading...</Typography>
        </Box>
      );
    }
    if (error || !svg) {
      return (
        <Box width={120} height={80} display="flex" alignItems="center" justifyContent="center" bgcolor="#f8f9fa" border="1px solid #dee2e6" borderRadius={1}>
          <Typography variant="caption" color="textSecondary" textAlign="center">{smiles ? 'Invalid SMILES' : 'N/A'}</Typography>
        </Box>
      );
    }
    return (
      <Box width={120} height={80} display="flex" alignItems="center" justifyContent="center" bgcolor="#fff" border="1px solid #dee2e6" borderRadius={1} p={0}>
        <span dangerouslySetInnerHTML={{ __html: svg }} style={{ width: '100%', height: '100%' }} />
      </Box>
    );
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Chemical Inventory</Typography>
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
                          {chemical.smiles ? <SmilesStructure smiles={chemical.smiles} id={chemical.cas_number} /> : <Typography color="textSecondary" variant="body2">N/A</Typography>}
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
