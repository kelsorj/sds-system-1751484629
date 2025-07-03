import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Chip,
  LinearProgress,
  Tabs,
  Tab
} from '@mui/material';
import {
  Search as SearchIcon,
  Article as ArticleIcon,
  Science as ScienceIcon
} from '@mui/icons-material';

const Search = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);

    // Simulate API search delay
    setTimeout(() => {
      // Mock search results
      const mockResults = {
        chemicals: [
          { cas_number: '67-64-1', name: 'Acetone', molecular_formula: 'C3H6O', has_sds: true },
          { cas_number: '64-17-5', name: 'Ethanol', molecular_formula: 'C2H5OH', has_sds: true },
          { cas_number: '67-68-5', name: 'Dimethyl sulfoxide', molecular_formula: 'C2H6OS', has_sds: true },
        ],
        sds_documents: [
          { cas_number: '67-64-1', chemical_name: 'Acetone', filename: 'acetone_sds_2024.pdf', source: 'Fisher' },
          { cas_number: '64-17-5', chemical_name: 'Ethanol', filename: 'ethanol_sds_2023.pdf', source: 'Sigma' },
          { cas_number: '75-09-2', chemical_name: 'Dichloromethane', filename: 'dcm_sds_2024.pdf', source: 'VWR' },
        ]
      };

      setSearchResults(mockResults);
      setLoading(false);
    }, 1000);
  };

  const handleQueryChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Search
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <form onSubmit={handleSearch}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search for chemicals or SDS documents"
              value={searchQuery}
              onChange={handleQueryChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
          </form>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Search by chemical name, CAS number, formula, or SDS content
          </Typography>
        </CardContent>
      </Card>

      {searchQuery && (
        <Paper>
          {loading ? (
            <LinearProgress />
          ) : (
            <Box>
              {searchResults.chemicals && searchResults.chemicals.length > 0 ? (
                <>
                  <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    aria-label="search results tabs"
                  >
                    <Tab icon={<ScienceIcon />} label={`Chemicals (${searchResults.chemicals.length})`} />
                    <Tab icon={<ArticleIcon />} label={`SDS Documents (${searchResults.sds_documents.length})`} />
                  </Tabs>

                  {activeTab === 0 ? (
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>CAS Number</TableCell>
                            <TableCell>Formula</TableCell>
                            <TableCell>SDS</TableCell>
                            <TableCell align="right">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {searchResults.chemicals.map((chemical) => (
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
                              <TableCell>
                                {chemical.has_sds ? (
                                  <Chip size="small" label="Available" color="success" />
                                ) : (
                                  <Chip size="small" label="Missing" color="error" />
                                )}
                              </TableCell>
                              <TableCell align="right">
                                <IconButton
                                  component={Link}
                                  to={`/sds/${chemical.cas_number}`}
                                  disabled={!chemical.has_sds}
                                >
                                  <ArticleIcon />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Chemical Name</TableCell>
                            <TableCell>CAS Number</TableCell>
                            <TableCell>SDS Document</TableCell>
                            <TableCell>Source</TableCell>
                            <TableCell align="right">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {searchResults.sds_documents.map((doc) => (
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
                              <TableCell>{doc.filename}</TableCell>
                              <TableCell>{doc.source}</TableCell>
                              <TableCell align="right">
                                <IconButton
                                  component={Link}
                                  to={`/sds/${doc.cas_number}`}
                                >
                                  <ArticleIcon />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </>
              ) : (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="h6">No results found</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Try using different keywords or search terms
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default Search;
