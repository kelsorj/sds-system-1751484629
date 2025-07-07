import api from './api';

export const chemicalService = {
  // Get all chemicals with optional filtering
  getChemicals: async (filters = {}) => {
    const response = await api.get('/chemicals', { params: filters });
    return response;
  },
  
  // Get total count of chemicals
  getChemicalsCount: async () => {
    try {
      const response = await api.get('/chemicals/count');
      return response.data.count;
    } catch (error) {
      console.error('Error fetching chemicals count:', error);
      // Fallback to counting all chemicals if count endpoint fails
      const response = await api.get('/chemicals');
      return response.data.length;
    }
  },
  
  // Get dashboard statistics
  getDashboardStats: async () => {
    try {
      const response = await api.get('/chemicals/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  },
  
  // Get inventory summary statistics
  getInventorySummary: async () => {
    const response = await api.get('/chemicals/summary');
    return response.data;
  },
  
  // Get a single chemical by CAS number
  getChemical: async (casNumber) => {
    const response = await api.get(`/chemicals/${casNumber}`);
    return response.data;
  },
  
  // Add a new chemical
  addChemical: async (chemicalData) => {
    const response = await api.post('/chemicals', chemicalData);
    return response.data;
  },
  
  // Update an existing chemical
  updateChemical: async (casNumber, updateData) => {
    const response = await api.put(`/chemicals/${casNumber}`, updateData);
    return response.data;
  },
  
  // Delete a chemical
  deleteChemical: async (casNumber) => {
    const response = await api.delete(`/chemicals/${casNumber}`);
    return response.data;
  }
};
