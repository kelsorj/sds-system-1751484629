import api from './api';

export const chemicalService = {
  // Get all chemicals with optional filtering
  getChemicals: async (filters = {}) => {
    const response = await api.get('/chemicals', { params: filters });
    return response;
  },
  
  // Get total count of chemicals
  getChemicalsCount: async () => {
    const response = await api.get('/chemicals');
    return response.data.length;
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
