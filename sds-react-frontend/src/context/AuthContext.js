import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Create a default user for automatic authentication
  const defaultUser = {
    id: 1,
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin'
  };
  
  const [user, setUser] = useState(defaultUser); // Automatically set the default user
  const [loading, setLoading] = useState(false); // Set loading to false initially
  const [error, setError] = useState(null);

  // Auto-authenticate on component mount - bypassing actual authentication
  useEffect(() => {
    // Create a dummy token and store it
    const dummyToken = 'auto-auth-token';
    localStorage.setItem('authToken', dummyToken);
    
    // No need to check with the backend - we're bypassing authentication
    setLoading(false);
  }, []);

  // Auto-login function - always succeeds without API call
  const login = async (credentials) => {
    // No need to call API - just set the user directly
    const dummyToken = 'auto-auth-token';
    localStorage.setItem('authToken', dummyToken);
    setUser(defaultUser);
    setError(null);
    return true;
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Export the useAuth hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
