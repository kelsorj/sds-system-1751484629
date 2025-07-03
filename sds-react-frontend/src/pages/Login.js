import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Divider,
  TextField,
  Typography
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const { login, error: authError, loading } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear field-specific error when user types
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      const success = await login(formData);
      if (success) {
        navigate('/');
      }
    }
  };

  // For demo purposes, include a bypass login
  const handleDemoLogin = async () => {
    // In a real app, you would never do this!
    // This is just for demonstration purposes
    const demoCredentials = {
      email: 'demo@example.com',
      password: 'demo123'
    };
    
    const success = await login(demoCredentials);
    if (success) {
      navigate('/');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          SDS Management System
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          Log in to access your chemical inventory and SDS documents
        </Typography>
      </Box>
      
      <Card>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Login
          </Typography>
          
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              margin="normal"
              variant="outlined"
              error={!!errors.email}
              helperText={errors.email}
              disabled={loading}
            />
            
            <TextField
              fullWidth
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              margin="normal"
              variant="outlined"
              error={!!errors.password}
              helperText={errors.password}
              disabled={loading}
            />
            
            {authError && (
              <Typography color="error" variant="body2" sx={{ mt: 2 }}>
                {authError}
              </Typography>
            )}
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Login'}
            </Button>
          </form>
          
          <Divider sx={{ my: 3 }}>
            <Typography variant="body2" color="textSecondary">
              For Demo Purposes
            </Typography>
          </Divider>
          
          <Button
            fullWidth
            variant="outlined"
            color="secondary"
            onClick={handleDemoLogin}
            disabled={loading}
          >
            Demo Login (No Authentication)
          </Button>
        </CardContent>
      </Card>
      
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography variant="body2">
          Don't have an account?{' '}
          <Link to="/register" style={{ textDecoration: 'none' }}>
            Register
          </Link>
        </Typography>
      </Box>
    </Container>
  );
};

export default Login;
