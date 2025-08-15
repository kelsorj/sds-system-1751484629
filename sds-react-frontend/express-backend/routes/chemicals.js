const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const translationService = require('../services/translationService');

// ... existing code ...

// Get all chemicals with NFPA data
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.*,
        CASE WHEN s.file_path IS NOT NULL THEN true ELSE false END as has_sds
      FROM chemicals c
      LEFT JOIN sds_files s ON c.cas_number = s.cas_number
      ORDER BY c.name
    `);

    // Add NFPA data to each chemical using the translation service
    const chemicalsWithNfpa = translationService.translateChemicalsList(result.rows);

    res.json(chemicalsWithNfpa);
  } catch (error) {
    console.error('Error fetching chemicals:', error);
    res.status(500).json({ error: 'Failed to fetch chemicals' });
  }
});

// ... existing code ...
