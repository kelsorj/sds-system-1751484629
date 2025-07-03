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
      // In a real app, you would fetch this data from your backend
      // Here we're simulating it for demonstration
      // const response = await chemicalService.getChemicals();
      // setChemicals(response.data);
      
      // Simulate API delay and data
      setTimeout(() => {
        const mockChemicals = [
          { cas_number: '67-64-1', name: 'Acetone', molecular_formula: 'C3H6O', quantity: 500, unit: 'g', has_sds: true },
          { cas_number: '64-17-5', name: 'Ethanol', molecular_formula: 'C2H5OH', quantity: 1000, unit: 'mL', has_sds: true },
          { cas_number: '7732-18-5', name: 'Water', molecular_formula: 'H2O', quantity: 5000, unit: 'mL', has_sds: false },
          { cas_number: '75-09-2', name: 'Dichloromethane', molecular_formula: 'CH2Cl2', quantity: 250, unit: 'mL', has_sds: true },
          { cas_number: '67-68-5', name: 'Dimethyl sulfoxide', molecular_formula: 'C2H6OS', quantity: 100, unit: 'mL', has_sds: true },
          { cas_number: '67-56-1', name: 'Methanol', molecular_formula: 'CH3OH', quantity: 1000, unit: 'mL', has_sds: true },
          { cas_number: '71-43-2', name: 'Benzene', molecular_formula: 'C6H6', quantity: 100, unit: 'mL', has_sds: false },
          { cas_number: '108-88-3', name: 'Toluene', molecular_formula: 'C7H8', quantity: 500, unit: 'mL', has_sds: true },
          { cas_number: '108-95-2', name: 'Phenol', molecular_formula: 'C6H5OH', quantity: 250, unit: 'g', has_sds: true },
          { cas_number: '108-94-1', name: 'Cyclohexanone', molecular_formula: 'C6H10O', quantity: 100, unit: 'mL', has_sds: false },
          { cas_number: '872-50-4', name: 'N-Methyl-2-pyrrolidone', molecular_formula: 'C5H9NO', quantity: 500, unit: 'mL', has_sds: true },
          { cas_number: '110-54-3', name: 'Hexane', molecular_formula: 'C6H14', quantity: 1000, unit: 'mL', has_sds: true },
        ];
        setChemicals(mockChemicals);
        setLoading(false);
      }, 1000);
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

  const downloadSds = async (casNumber) => {
    try {
      // In a real app, you would call the API to download the SDS
      // const blob = await sdsService.downloadSds(casNumber);
      // const url = window.URL.createObjectURL(blob);
      // const a = document.createElement('a');
      // a.href = url;
      // a.download = `SDS-${casNumber}.pdf`;
      // document.body.appendChild(a);
      // a.click();
      // a.remove();
      
      alert(`Downloading SDS for ${casNumber}...`);
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
                    <TableCell>SDS</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedChemicals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No chemicals found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedChemicals.map((chemical) => (
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
                          {chemical.has_sds ? (
                            <Tooltip title="Download SDS">
                              <IconButton
                                color="primary"
                                size="small"
                                onClick={() => downloadSds(chemical.cas_number)}
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
