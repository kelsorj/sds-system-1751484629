import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import { CircularProgress, Box, CssBaseline } from '@mui/material';
import './App.css';

// Context
import { AuthProvider, useAuth } from './context/AuthContext';

// Layouts
import AppLayout from './components/Layout/AppLayout';

// Pages - Eager loading for primary pages
import Dashboard from './pages/Dashboard';
import ChemicalList from './pages/ChemicalList';
import SDSDocuments from './pages/SDSDocuments';
import ImportData from './pages/ImportData';

// Pages - Lazy loading for secondary pages
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ChemicalDetails = lazy(() => import('./pages/ChemicalDetails'));
const ChemicalForm = lazy(() => import('./pages/ChemicalForm'));
const SDSViewer = lazy(() => import('./pages/SDSViewer'));
const BulkUpload = lazy(() => import('./pages/BulkUpload'));
const Settings = lazy(() => import('./pages/Settings'));

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 500,
    },
  },
});

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
              <CircularProgress />
            </Box>
          }>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Protected routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/chemicals" element={
                <ProtectedRoute>
                  <AppLayout>
                    <ChemicalList />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/chemicals/:casNumber" element={
                <ProtectedRoute>
                  <AppLayout>
                    <ChemicalDetails />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/chemicals/add" element={
                <ProtectedRoute>
                  <AppLayout>
                    <ChemicalForm />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/chemicals/:casNumber/edit" element={
                <ProtectedRoute>
                  <AppLayout>
                    <ChemicalForm />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/sds" element={
                <ProtectedRoute>
                  <AppLayout>
                    <SDSDocuments />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/sds/:casNumber" element={
                <ProtectedRoute>
                  <AppLayout>
                    <SDSViewer />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/import" element={
                <ProtectedRoute>
                  <AppLayout>
                    <ImportData />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/bulk-upload" element={
                <ProtectedRoute>
                  <AppLayout>
                    <BulkUpload />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/settings" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Settings />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
