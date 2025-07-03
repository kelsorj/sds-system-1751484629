import api from './api';

export const sdsService = {
  // Get SDS information for a chemical by CAS number
  getSdsInfo: async (casNumber) => {
    const response = await api.get(`/sds/${casNumber}`);
    return response.data;
  },
  
  // Download SDS file for a chemical
  downloadSds: async (casNumber) => {
    const response = await api.get(`/sds/${casNumber}/download`, {
      responseType: 'blob'
    });
    return response.data;
  },
  
  // Trigger an SDS download from sources for a CAS number
  triggerSdsDownload: async (casNumber) => {
    const response = await api.post(`/sds/${casNumber}/download-from-sources`);
    return response.data;
  },
  
  // Upload an SDS file for a CAS number
  uploadSds: async (casNumber, file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post(`/sds/${casNumber}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },
  
  // Process batch import of chemicals with SDS downloads
  importCsv: async (file, downloadSds = true) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('download_sds', downloadSds);
    
    const response = await api.post('/upload-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },
};
