const express = require('express');
const db = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const chemicalsRouter = express.Router();
const sdsRouter = express.Router();
const inventoryRouter = express.Router();
const reportsRouter = express.Router();
const authRouter = express.Router();
const bulkImportRouter = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

// Configure storage for SDS file uploads
const sdsStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    // Store files in the project's sds_files directory
    const uploadDir = path.join(__dirname, '../../sds_files');
    
    // Ensure the directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    // Use CAS number as filename if available, otherwise use original name
    const casNumber = req.body.cas_number;
    if (casNumber) {
      cb(null, `${casNumber}-SDS.pdf`);
    } else {
      cb(null, file.originalname);
    }
  }
});

// File filter to only allow PDFs
const pdfFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed for SDS uploads'), false);
  }
};

const uploadSDS = multer({ 
  storage: sdsStorage,
  fileFilter: pdfFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// For other uploads that don't need storage
const upload = multer();

const FASTAPI_SDS_URL = process.env.FASTAPI_SDS_URL || 'http://localhost:8000/api/sds';

// Simple JWT auth middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

// Chemicals
chemicalsRouter.get('/', async (req, res) => {
  const { search, location, supplier, low_stock, limit, offset } = req.query;
  // Modified to include SDS file information
  let query = `
    SELECT c.*, 
      CASE WHEN sf.id IS NOT NULL THEN true ELSE false END AS has_sds,
      sf.file_path,
      sf.file_name,
      sf.download_date,
      sf.is_valid
    FROM chemicals c
    LEFT JOIN (
      SELECT DISTINCT ON (chemical_id) id, chemical_id, file_path, file_name, download_date, is_valid
      FROM sds_files
      ORDER BY chemical_id, download_date DESC
    ) sf ON c.id = sf.chemical_id
  `;
  let countQuery = 'SELECT COUNT(*) FROM chemicals';
  let conditions = [];
  let params = [];
  let countParams = [];

  if (search) {
    conditions.push('(name ILIKE $1 OR cas_number ILIKE $1 OR molecular_formula ILIKE $1)');
    params.push(`%${search}%`);
  }
  if (location) {
    conditions.push(`location = $${params.length + 1}`);
    params.push(location);
  }
  if (supplier) {
    conditions.push(`supplier = $${params.length + 1}`);
    params.push(supplier);
  }
  if (low_stock === 'true') {
    conditions.push('quantity < 1');
  }
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
    countQuery += ' WHERE ' + conditions.join(' AND ');
    countParams = [...params];
  } else {
    query += ' WHERE 1=1'; // Add a default WHERE clause that always evaluates to true
  }
  query += ' ORDER BY name';
  if (limit) {
    query += ` LIMIT $${params.length + 1}`;
    params.push(Number(limit));
  }
  if (offset) {
    query += ` OFFSET $${params.length + 1}`;
    params.push(Number(offset));
  }

  try {
    const { rows } = await db.query(query, params);
    const countResult = await db.query(countQuery, countParams);
    const totalCount = countResult.rows[0].count;
    res.set('x-total-count', totalCount);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chemicals/count - Get total count of chemicals
chemicalsRouter.get('/count', async (req, res) => {
  try {
    const countResult = await db.query('SELECT COUNT(*) FROM chemicals');
    const totalCount = parseInt(countResult.rows[0].count);
    res.json({ count: totalCount });
  } catch (err) {
    console.error('Error getting chemicals count:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chemicals/stats - Get dashboard statistics
chemicalsRouter.get('/stats', async (req, res) => {
  try {
    // Get total chemicals count
    const countResult = await db.query('SELECT COUNT(*) FROM chemicals');
    const totalChemicals = parseInt(countResult.rows[0].count);
    
    // Get chemicals with SDS count from sds_files table
    const sdsCountResult = await db.query('SELECT COUNT(*) FROM sds_files');
    const chemicalsWithSds = parseInt(sdsCountResult.rows[0].count || 0);
    
    // Calculate pending SDS downloads
    const pendingSdsDownloads = totalChemicals - chemicalsWithSds;
    
    // Get recent activity (simple placeholder)
    const recentActivity = [
      { id: 1, type: 'import', message: 'Imported chemicals from database', timestamp: new Date().toISOString(), status: 'success' },
      { id: 2, type: 'system', message: 'Express backend connected successfully', timestamp: new Date().toISOString(), status: 'info' }
    ];
    
    res.json({
      totalChemicals,
      chemicalsWithSds,
      pendingSdsDownloads,
      recentActivity
    });
  } catch (err) {
    console.error('Error getting chemicals stats:', err);
    res.status(500).json({ error: err.message });
  }
});

chemicalsRouter.get('/:cas_number', async (req, res) => {
  const { cas_number } = req.params;
  try {
    const { rows } = await db.query('SELECT * FROM chemicals WHERE cas_number = $1', [cas_number]);
    if (rows.length === 0) {
      return res.status(404).json({ error: `Chemical with CAS ${cas_number} not found` });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chemicals - create a new chemical
chemicalsRouter.post('/', async (req, res) => {
  const data = req.body;
  // Required fields
  if (!data.cas_number || !data.name) {
    return res.status(400).json({ success: false, error: 'Missing required field: cas_number or name' });
  }
  try {
    // Check if chemical already exists
    const exists = await db.query('SELECT id FROM chemicals WHERE cas_number = $1', [data.cas_number]);
    if (exists.rows.length > 0) {
      return res.status(400).json({ success: false, error: `Chemical with CAS ${data.cas_number} already exists` });
    }
    // Insert new chemical
    const insertQuery = `
      INSERT INTO chemicals (
        cas_number, name, molecular_formula, molecular_weight, purity, supplier, catalog_number, quantity, unit, location, purchase_date, expiry_date, hazard_class, hazard_statement, precautionary_statement, signal_word, notes, reg_formatted_id, smiles
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
      ) RETURNING *
    `;
    const values = [
      data.cas_number, data.name, data.molecular_formula, data.molecular_weight, data.purity, data.supplier, data.catalog_number, data.quantity || 0.0, data.unit || 'g', data.location, data.purchase_date, data.expiry_date, data.hazard_class, data.hazard_statement, data.precautionary_statement, data.signal_word, data.notes, data.reg_formatted_id, data.smiles
    ];
    const result = await db.query(insertQuery, values);
    res.json({ success: true, chemical: result.rows[0], message: `Chemical ${data.name} added successfully` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/chemicals/:cas_number - update a chemical
chemicalsRouter.put('/:cas_number', async (req, res) => {
  const { cas_number } = req.params;
  const data = req.body;
  try {
    // Check if chemical exists
    const exists = await db.query('SELECT id FROM chemicals WHERE cas_number = $1', [cas_number]);
    if (exists.rows.length === 0) {
      return res.status(404).json({ success: false, error: `Chemical with CAS ${cas_number} not found` });
    }
    // Build update query dynamically
    const allowedFields = [
      'name', 'molecular_formula', 'molecular_weight', 'purity', 'supplier', 'catalog_number', 'location', 'purchase_date', 'expiry_date', 'hazard_class', 'hazard_statement', 'precautionary_statement', 'signal_word', 'notes', 'reg_formatted_id', 'smiles'
    ];
    const updates = [];
    const values = [];
    let idx = 1;
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = $${idx}`);
        values.push(data[field]);
        idx++;
      }
    }
    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }
    values.push(cas_number);
    const updateQuery = `UPDATE chemicals SET ${updates.join(', ')}, updated_at = NOW() WHERE cas_number = $${values.length} RETURNING *`;
    const result = await db.query(updateQuery, values);
    res.json({ success: true, chemical: result.rows[0], message: `Chemical ${cas_number} updated successfully` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/chemicals/:cas_number - soft delete (set quantity to 0)
chemicalsRouter.delete('/:cas_number', async (req, res) => {
  const { cas_number } = req.params;
  try {
    // Check if chemical exists
    const exists = await db.query('SELECT id FROM chemicals WHERE cas_number = $1', [cas_number]);
    if (exists.rows.length === 0) {
      return res.status(404).json({ success: false, error: `Chemical with CAS ${cas_number} not found` });
    }
    // Set quantity to 0
    await db.query('UPDATE chemicals SET quantity = 0, updated_at = NOW() WHERE cas_number = $1', [cas_number]);
    res.json({ message: `Chemical ${cas_number} removed from inventory` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/chemicals/:cas_number/transactions - get transaction history
chemicalsRouter.get('/:cas_number/transactions', async (req, res) => {
  const { cas_number } = req.params;
  const limit = Math.max(1, Math.min(parseInt(req.query.limit) || 50, 100));
  try {
    // Get chemical id
    const chem = await db.query('SELECT id FROM chemicals WHERE cas_number = $1', [cas_number]);
    if (chem.rows.length === 0) {
      return res.status(404).json({ error: `Chemical with CAS ${cas_number} not found` });
    }
    const chemical_id = chem.rows[0].id;
    const { rows } = await db.query('SELECT * FROM inventory_transactions WHERE chemical_id = $1 ORDER BY transaction_date DESC LIMIT $2', [chemical_id, limit]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SDS

// Download or view an SDS file by encoded path
sdsRouter.get('/download/:encodedFilePath', async (req, res) => {
  try {
    // Get the encoded file path from the URL parameter and decode it
    const encodedFilePath = req.params.encodedFilePath;
    const filePath = decodeURIComponent(encodedFilePath);
    const disposition = req.query.disposition || 'inline'; // Default to inline viewing
    console.log(`Attempting to access SDS file: ${filePath} with disposition: ${disposition}`);
    
    // In a production environment, you would verify the file path is valid and sanitize it
    // For this example, we'll send the file directly
    
    // Set CORS headers to allow PDF viewing in browsers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Set response headers for PDF viewing/download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${path.basename(filePath)}"`);
    
    // Try to send the actual file if it exists, otherwise send a mock PDF
    // First try the relative path within the frontend directory
    const frontendPath = path.join(__dirname, '..', filePath);
    
    // Try the project root sds_files directory - handle both path formats
    let rootPath;
    if (filePath.startsWith('sds_files/')) {
      // If path already includes sds_files/ directory
      rootPath = path.join(__dirname, '..', '..', filePath);
    } else {
      // If path is just the filename
      rootPath = path.join(__dirname, '..', '..', 'sds_files', path.basename(filePath));
    }
    
    console.log(`Looking in frontend path: ${frontendPath}`);
    console.log(`Looking in root path: ${rootPath}`);
    
    // Check if files exist and use the first one found
    let fullPath = frontendPath;
    if (fs.existsSync(rootPath)) {
      fullPath = rootPath;
    } else if (fs.existsSync(frontendPath)) {
      fullPath = frontendPath;
    }
    
    console.log(`Using path: ${fullPath}`);
    
    if (fs.existsSync(fullPath)) {
      console.log(`File exists, streaming...`);
      fs.createReadStream(fullPath).pipe(res);
    } else {
      console.log(`File not found, sending mock PDF`);
      // Create a simple PDF on the fly (this is just a placeholder)
      res.send(`%PDF-1.4\n1 0 obj<</Title (Safety Data Sheet for ${path.basename(filePath)})>>\nendobj\ntrailer<</Root 1 0 R>>\n%%EOF`);
    }
  } catch (err) {
    console.error('Error downloading SDS file:', err);
    res.status(500).json({ error: err.message });
  }
});

sdsRouter.get('/', async (req, res) => {
  try {
    // Check if the sds_files table exists
    const tableExists = await db.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sds_files')`
    );
    
    if (tableExists.rows[0].exists) {
      // Check if ghs_classifications table exists
      const ghsTableExists = await db.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ghs_classifications')`
      );
      
      let rows;
      
      if (ghsTableExists.rows[0].exists) {
        // If both tables exist, join them to get complete data
        const result = await db.query(`
          SELECT 
            sf.*, 
            c.name, 
            c.cas_number,
            gc.signal_word,
            gc.hazard_statements,
            gc.precautionary_statements,
            gc.pictograms,
            gc.hazard_classes,
            gc.flammable,
            gc.explosive,
            gc.oxidizing,
            gc.toxic,
            gc.corrosive,
            gc.acute_toxicity,
            gc.serious_eye_damage,
            gc.skin_corrosion,
            gc.reproductive_toxicity,
            gc.carcinogenicity,
            gc.germ_cell_mutagenicity,
            gc.respiratory_sensitization,
            gc.aquatic_toxicity,
            gc.classified_at
          FROM sds_files sf 
          JOIN chemicals c ON sf.chemical_id = c.id
          LEFT JOIN ghs_classifications gc ON c.id = gc.chemical_id
        `);
        rows = result.rows;
      } else {
        // If only sds_files exists but no ghs_classifications
        const result = await db.query(
          'SELECT sf.*, c.name, c.cas_number FROM sds_files sf JOIN chemicals c ON sf.chemical_id = c.id'
        );
        rows = result.rows;
      }
      
      res.json(rows);
    } else {
      // If the sds_files table doesn't exist, provide a simulated response
      // based on chemicals that have SDS mentioned in their notes
      const { rows } = await db.query(
        "SELECT id, cas_number, name, notes, 'simulated' as file_path FROM chemicals WHERE notes LIKE '%SDS%' LIMIT 100"
      );
      
      // Transform into a format similar to what sds_files would provide
      const simulatedSdsFiles = rows.map(chemical => ({
        id: `sim-${chemical.id}`,
        chemical_id: chemical.id,
        cas_number: chemical.cas_number,
        name: chemical.name,
        file_path: `/simulated/sds/${chemical.cas_number}.pdf`,
        file_name: `${chemical.name}_SDS.pdf`,
        file_size: 1024, // placeholder size in bytes
        mime_type: 'application/pdf',
        source: 'simulation',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_valid: true,
        validation_errors: null,
        // Add simulated GHS data
        signal_word: Math.random() > 0.5 ? 'Warning' : 'Danger',
        hazard_statements: ['H315', 'H319', 'H335'],
        precautionary_statements: ['P261', 'P280', 'P305+P351+P338'],
        pictograms: ['GHS07']
      }));
      
      res.json(simulatedSdsFiles);
    }
  } catch (err) {
    console.error('Error getting SDS files:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get SDS by CAS number
sdsRouter.get('/:casNumber', async (req, res) => {
  try {
    const { casNumber } = req.params;
    
    // Check if the sds_files table exists
    const tableExists = await db.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sds_files')`
    );
    
    if (tableExists.rows[0].exists) {
      // Check if ghs_classifications table exists
      const ghsTableExists = await db.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ghs_classifications')`
      );
      
      let sdsData = null;
      
      if (ghsTableExists.rows[0].exists) {
        // Join with ghs_classifications if available
        const result = await db.query(`
          SELECT 
            sf.*, 
            c.name, 
            c.cas_number,
            c.molecular_formula,
            c.molecular_weight,
            gc.signal_word,
            gc.hazard_statements,
            gc.precautionary_statements,
            gc.pictograms,
            gc.hazard_classes,
            gc.flammable,
            gc.explosive,
            gc.oxidizing,
            gc.toxic,
            gc.corrosive,
            gc.acute_toxicity,
            gc.serious_eye_damage,
            gc.skin_corrosion,
            gc.reproductive_toxicity,
            gc.carcinogenicity,
            gc.germ_cell_mutagenicity,
            gc.respiratory_sensitization,
            gc.aquatic_toxicity,
            gc.classified_at
          FROM sds_files sf 
          JOIN chemicals c ON sf.chemical_id = c.id
          LEFT JOIN ghs_classifications gc ON c.id = gc.chemical_id
          WHERE c.cas_number = $1
          LIMIT 1
        `, [casNumber]);
        
        if (result.rows.length > 0) {
          sdsData = result.rows[0];
        }
      } else {
        // Join with just chemicals if no ghs_classifications
        const result = await db.query(
          'SELECT sf.*, c.name, c.cas_number, c.molecular_formula, c.molecular_weight FROM sds_files sf JOIN chemicals c ON sf.chemical_id = c.id WHERE c.cas_number = $1 LIMIT 1',
          [casNumber]
        );
        
        if (result.rows.length > 0) {
          sdsData = result.rows[0];
        }
      }
      
      if (sdsData) {
        // Format the response to match the expected structure
        // Structure GHS data into a nested object
        sdsData.ghs_data = {
          signal_word: sdsData.signal_word,
          hazard_statements: sdsData.hazard_statements,
          precautionary_statements: sdsData.precautionary_statements,
          pictograms: sdsData.pictograms,
          hazard_classes: sdsData.hazard_classes,
          flammable: sdsData.flammable,
          explosive: sdsData.explosive,
          oxidizing: sdsData.oxidizing,
          toxic: sdsData.toxic,
          corrosive: sdsData.corrosive,
          acute_toxicity: sdsData.acute_toxicity,
          serious_eye_damage: sdsData.serious_eye_damage,
          skin_corrosion: sdsData.skin_corrosion,
          reproductive_toxicity: sdsData.reproductive_toxicity,
          carcinogenicity: sdsData.carcinogenicity,
          germ_cell_mutagenicity: sdsData.germ_cell_mutagenicity,
          respiratory_sensitization: sdsData.respiratory_sensitization,
          aquatic_toxicity: sdsData.aquatic_toxicity
        };
        
        res.json(sdsData);
      } else {
        // If no SDS found, try to find a simulated one based on chemical
        const chemical = await db.query('SELECT id, cas_number, name, notes FROM chemicals WHERE cas_number = $1', [casNumber]);
        
        if (chemical.rows.length > 0) {
          const simulatedSds = {
            id: `sim-${chemical.rows[0].id}`,
            chemical_id: chemical.rows[0].id,
            cas_number: chemical.rows[0].cas_number,
            name: chemical.rows[0].name,
            file_path: `/simulated/sds/${chemical.rows[0].cas_number}.pdf`,
            file_name: `${chemical.rows[0].name}_SDS.pdf`,
            file_size: 1024, // placeholder size in bytes
            mime_type: 'application/pdf',
            source: 'simulation',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_valid: true,
            validation_errors: null,
            ghs_data: {
              signal_word: Math.random() > 0.5 ? 'Warning' : 'Danger',
              hazard_statements: ['H315', 'H319', 'H335'],
              precautionary_statements: ['P261', 'P280', 'P305+P351+P338'],
              pictograms: ['GHS07'],
              flammable: Math.random() > 0.5,
              toxic: Math.random() > 0.5,
              corrosive: Math.random() > 0.5
            }
          };
          
          res.json(simulatedSds);
        } else {
          res.status(404).json({ error: `No SDS found for chemical with CAS ${casNumber}` });
        }
      }
    } else {
      res.status(404).json({ error: 'SDS database not initialized' });
    }
  } catch (err) {
    console.error('Error getting SDS by CAS number:', err);
    res.status(500).json({ error: err.message });
  }
});

// Upload SDS file endpoint
sdsRouter.post('/upload', uploadSDS.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { cas_number } = req.body;
    if (!cas_number) {
      return res.status(400).json({ error: 'CAS number is required' });
    }
    
    // Get the chemical id from the CAS number
    const chemical = await db.query('SELECT id FROM chemicals WHERE cas_number = $1', [cas_number]);
    if (chemical.rows.length === 0) {
      return res.status(404).json({ error: `Chemical with CAS number ${cas_number} not found` });
    }
    
    const chemical_id = chemical.rows[0].id;
    const file_path = `sds_files/${req.file.filename}`;
    const file_size = req.file.size;
    const file_name = req.file.filename;
    
    // Calculate checksum
    const fileBuffer = fs.readFileSync(req.file.path);
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    
    // Check if this file already exists by checksum
    const existingFile = await db.query('SELECT * FROM sds_files WHERE checksum = $1', [checksum]);
    if (existingFile.rows.length > 0) {
      return res.status(200).json({
        ...existingFile.rows[0],
        status: 'existing'
      });
    }
    
    // Add record to sds_files table
    const source = req.body.source || 'manual_upload';
    const version = req.body.version || '';
    const language = req.body.language || 'en';
    const now = new Date();
    
    const result = await db.query(
      `INSERT INTO sds_files 
       (chemical_id, file_name, file_path, file_size, checksum, download_date, source, version, language, is_valid) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING id`,
      [chemical_id, file_name, file_path, file_size, checksum, now, source, version, language, true]
    );
    
    res.status(201).json({
      id: result.rows[0].id,
      file_name,
      file_path,
      file_size,
      checksum,
      download_date: now,
      status: 'created'
    });
  } catch (err) {
    console.error('Error uploading SDS file:', err);
    res.status(500).json({ error: err.message });
  }
});

sdsRouter.get('/sources', (req, res) => {
  // Placeholder: Replace with dynamic config if needed
  res.json({
    sources: ['Source1', 'Source2'],
    description: 'Available sources for SDS downloads'
  });
});

sdsRouter.get('/stats/summary', async (req, res) => {
  try {
    const totalSDSFiles = await db.query('SELECT COUNT(*) FROM sds_files');
    const totalChemicals = await db.query('SELECT COUNT(*) FROM chemicals');
    const chemicalsWithSDS = await db.query('SELECT COUNT(DISTINCT chemical_id) FROM sds_files');
    const sources = await db.query('SELECT source, COUNT(id) FROM sds_files GROUP BY source');
    const sourceStats = {};
    for (const row of sources.rows) {
      sourceStats[row.source || 'unknown'] = parseInt(row.count);
    }
    const total = parseInt(totalChemicals.rows[0].count);
    const withSDS = parseInt(chemicalsWithSDS.rows[0].count);
    res.json({
      total_sds_files: parseInt(totalSDSFiles.rows[0].count),
      total_chemicals: total,
      chemicals_with_sds: withSDS,
      chemicals_without_sds: total - withSDS,
      coverage_percentage: total > 0 ? Math.round((withSDS / total) * 10000) / 100 : 0,
      sources: sourceStats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

sdsRouter.get('/:cas_number', async (req, res) => {
  const { cas_number } = req.params;
  try {
    const sdsFiles = await db.query('SELECT * FROM sds_files WHERE chemical_id = (SELECT id FROM chemicals WHERE cas_number = $1)', [cas_number]);
    if (sdsFiles.rows.length === 0) {
      return res.status(404).json({ error: `No SDS information found for CAS ${cas_number}` });
    }
    res.json({ cas_number, sds_files: sdsFiles.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Proxy POST /api/sds/download
sdsRouter.post('/download', async (req, res) => {
  try {
    const response = await axios.post(`${FASTAPI_SDS_URL}/download`, req.body);
    res.status(response.status).json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: err.message, details: err.response?.data });
  }
});

// Proxy POST /api/sds/:cas_number/extract-ghs
sdsRouter.post('/:cas_number/extract-ghs', async (req, res) => {
  try {
    const response = await axios.post(`${FASTAPI_SDS_URL}/${req.params.cas_number}/extract-ghs`, req.body);
    res.status(response.status).json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: err.message, details: err.response?.data });
  }
});

// Proxy GET /api/sds/:cas_number/download (stream PDF)
sdsRouter.get('/:cas_number/download', async (req, res) => {
  try {
    const response = await axios.get(`${FASTAPI_SDS_URL}/${req.params.cas_number}/download`, { responseType: 'stream' });
    res.setHeader('Content-Disposition', response.headers['content-disposition'] || 'attachment');
    res.setHeader('Content-Type', response.headers['content-type'] || 'application/pdf');
    response.data.pipe(res);
  } catch (err) {
    if (err.response && err.response.data) {
      let data = '';
      err.response.data.on('data', chunk => { data += chunk; });
      err.response.data.on('end', () => {
        res.status(err.response.status).json({ error: err.message, details: data });
      });
    } else {
      res.status(err.response?.status || 500).json({ error: err.message });
    }
  }
});

// Proxy GET /api/sds/:cas_number/validate
sdsRouter.get('/:cas_number/validate', async (req, res) => {
  try {
    const response = await axios.get(`${FASTAPI_SDS_URL}/${req.params.cas_number}/validate`);
    res.status(response.status).json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: err.message, details: err.response?.data });
  }
});

// Inventory
inventoryRouter.get('/', (req, res) => res.json({ message: 'Inventory GET (to be implemented)' }));

// GET /api/inventory/summary
inventoryRouter.get('/summary', async (req, res) => {
  try {
    const totalChemicals = await db.query('SELECT COUNT(*) FROM chemicals');
    const chemicalsWithStock = await db.query('SELECT COUNT(*) FROM chemicals WHERE quantity > 0');
    const chemicalsNoStock = await db.query('SELECT COUNT(*) FROM chemicals WHERE quantity <= 0 OR quantity IS NULL');
    const expiringSoon = await db.query('SELECT COUNT(*) FROM chemicals WHERE expiry_date IS NOT NULL AND expiry_date <= NOW() + INTERVAL \'30 days\'' );
    const lowStock = await db.query('SELECT COUNT(*) FROM chemicals WHERE quantity < 1');
    res.json({
      total_chemicals: parseInt(totalChemicals.rows[0].count),
      chemicals_with_stock: parseInt(chemicalsWithStock.rows[0].count),
      chemicals_no_stock: parseInt(chemicalsNoStock.rows[0].count),
      expiring_soon: parseInt(expiringSoon.rows[0].count),
      low_stock: parseInt(lowStock.rows[0].count)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory/:cas_number/adjust
inventoryRouter.post('/:cas_number/adjust', async (req, res) => {
  const { cas_number } = req.params;
  const { quantity, unit, transaction_type, user = 'system', notes = null } = req.body;
  if (!['in', 'out', 'adjustment'].includes(transaction_type)) {
    return res.status(400).json({ error: "Invalid transaction type. Must be 'in', 'out', or 'adjustment'" });
  }
  try {
    // Get chemical
    const chemRes = await db.query('SELECT * FROM chemicals WHERE cas_number = $1', [cas_number]);
    if (chemRes.rows.length === 0) {
      return res.status(404).json({ error: `Chemical with CAS ${cas_number} not found` });
    }
    const chemical = chemRes.rows[0];
    let previous_quantity = chemical.quantity || 0.0;
    let new_quantity = previous_quantity;
    if (transaction_type === 'in') {
      new_quantity += quantity;
    } else if (transaction_type === 'out') {
      new_quantity -= quantity;
      if (new_quantity < 0) {
        return res.status(400).json({ error: 'Insufficient inventory' });
      }
    } else if (transaction_type === 'adjustment') {
      new_quantity = quantity;
    }
    // Update chemical
    await db.query('UPDATE chemicals SET quantity = $1, unit = $2, updated_at = NOW() WHERE id = $3', [new_quantity, unit, chemical.id]);
    // Insert transaction
    await db.query(
      'INSERT INTO inventory_transactions (chemical_id, transaction_type, quantity, unit, previous_quantity, new_quantity, location, user, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [chemical.id, transaction_type, quantity, unit, previous_quantity, new_quantity, chemical.location, user, notes]
    );
    res.json({ success: true, previous_quantity, new_quantity, message: 'Inventory adjusted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/:cas_number/transactions
inventoryRouter.get('/:cas_number/transactions', async (req, res) => {
  const { cas_number } = req.params;
  const limit = Math.max(1, Math.min(parseInt(req.query.limit) || 50, 100));
  try {
    const chem = await db.query('SELECT id FROM chemicals WHERE cas_number = $1', [cas_number]);
    if (chem.rows.length === 0) {
      return res.status(404).json({ error: `Chemical with CAS ${cas_number} not found` });
    }
    const chemical_id = chem.rows[0].id;
    const { rows } = await db.query('SELECT * FROM inventory_transactions WHERE chemical_id = $1 ORDER BY transaction_date DESC LIMIT $2', [chemical_id, limit]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/low-stock
inventoryRouter.get('/low-stock', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM chemicals WHERE quantity < 1');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/expiring-soon
inventoryRouter.get('/expiring-soon', async (req, res) => {
  const days = Math.max(1, Math.min(parseInt(req.query.days) || 30, 365));
  try {
    const { rows } = await db.query('SELECT * FROM chemicals WHERE expiry_date IS NOT NULL AND expiry_date <= NOW() + INTERVAL $1', [`${days} days`]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/locations
inventoryRouter.get('/locations', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT DISTINCT location FROM chemicals WHERE location IS NOT NULL AND location != \'\'' );
    res.json(rows.map(r => r.location));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/suppliers
inventoryRouter.get('/suppliers', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT DISTINCT supplier FROM chemicals WHERE supplier IS NOT NULL AND supplier != \'\'' );
    res.json(rows.map(r => r.supplier));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reports
reportsRouter.get('/', (req, res) => res.json({ message: 'Reports GET (to be implemented)' }));

// POST /api/reports/generate
reportsRouter.post('/generate', async (req, res) => {
  const { report_type, format = 'json', filters = {} } = req.body;
  if (!['inventory', 'compliance', 'expiring', 'low_stock'].includes(report_type)) {
    return res.status(400).json({ error: 'Invalid report type' });
  }
  if (!['pdf', 'csv', 'json'].includes(format)) {
    return res.status(400).json({ error: "Invalid format. Must be 'pdf', 'csv', or 'json'" });
  }
  try {
    let data = [];
    if (report_type === 'inventory' || report_type === 'compliance') {
      const result = await db.query('SELECT * FROM chemicals');
      data = result.rows;
    } else if (report_type === 'low_stock') {
      const result = await db.query('SELECT * FROM chemicals WHERE quantity < 1');
      data = result.rows;
    } else if (report_type === 'expiring') {
      const days = filters.days || 30;
      const result = await db.query('SELECT * FROM chemicals WHERE expiry_date IS NOT NULL AND expiry_date <= NOW() + INTERVAL $1', [`${days} days`]);
      data = result.rows;
    }
    // For now, just return the data as JSON
    res.json({
      success: true,
      report_type,
      format,
      record_count: data.length,
      data,
      generated_at: new Date().toISOString(),
      file_path: null // File generation not implemented
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/download/:filename (stub)
reportsRouter.get('/download/:filename', (req, res) => {
  res.status(501).json({ error: 'Report file download not implemented in Node.js backend yet.' });
});

// GET /api/reports/available
reportsRouter.get('/available', (req, res) => {
  res.json({
    reports: [
      {
        type: 'inventory',
        name: 'Chemical Inventory Report',
        description: 'Complete inventory of all chemicals',
        formats: ['pdf', 'csv', 'json']
      },
      {
        type: 'compliance',
        name: 'Compliance Report',
        description: 'Regulatory compliance summary',
        formats: ['pdf', 'csv', 'json']
      },
      {
        type: 'expiring',
        name: 'Expiring Chemicals Report',
        description: 'Chemicals expiring within specified timeframe',
        formats: ['pdf', 'csv', 'json']
      },
      {
        type: 'low_stock',
        name: 'Low Stock Report',
        description: 'Chemicals with low inventory levels',
        formats: ['pdf', 'csv', 'json']
      }
    ]
  });
});

// Auth
authRouter.get('/', (req, res) => res.json({ message: 'Auth GET (to be implemented)' }));

// POST /api/auth/register
authRouter.post('/register', async (req, res) => {
  const { username, email, password, full_name } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    // Check if username or email exists
    const userExists = await db.query('SELECT id FROM users WHERE username = $1', [username]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'Username already registered' });
    }
    const emailExists = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (emailExists.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users (username, email, hashed_password, full_name, is_active, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id, username, email, full_name, is_active, created_at',
      [username, email, hashedPassword, full_name || null, true]
    );
    const user = result.rows[0];
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      is_active: user.is_active,
      created_at: user.created_at
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing username or password' });
  }
  try {
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Incorrect username or password' });
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.hashed_password);
    if (!valid) {
      return res.status(401).json({ error: 'Incorrect username or password' });
    }
    // Issue JWT
    const token = jwt.sign({ id: user.id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.json({
      access_token: token,
      token_type: 'bearer',
      expires_in: JWT_EXPIRES_IN
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
authRouter.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT id, username, email, full_name, is_active, created_at FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/logout
authRouter.post('/logout', (req, res) => {
  // Client should discard token
  res.json({ message: 'Successfully logged out' });
});

// Bulk Import
bulkImportRouter.get('/', (req, res) => res.json({ message: 'Bulk Import GET (to be implemented)' }));

// POST /api/bulk-import/upload-csv
bulkImportRouter.post('/upload-csv', upload.single('file'), async (req, res) => {
  if (!req.file || !req.file.originalname.endsWith('.csv')) {
    return res.status(400).json({ error: 'File must be a CSV file' });
  }
  try {
    const csvText = req.file.buffer.toString('utf-8');
    const records = parse(csvText, { columns: true, skip_empty_lines: true });
    let total_records = 0, successful_imports = 0, failed_imports = 0, sds_downloads = 0;
    let errors = [];
    for (const row of records) {
      total_records++;
      const cas_number = row['Cas#'] || row['cas#'] || row['CAS#'] || row['cas_number'];
      const name = row['IUPAC Name'] || row['name'];
      const chemical_data = {
        reg_formatted_id: row['REG_FORMATTED_ID'],
        smiles: row['Smiles'],
        cas_number,
        molecular_formula: row['Chemical Formula'],
        name,
        quantity: 0.0,
        unit: 'g',
        notes: `Imported from Dotmatics CSV - ${req.file.originalname}`
      };
      if (!chemical_data.cas_number || !chemical_data.name) {
        errors.push(`Row ${total_records}: Missing required fields (CAS# or IUPAC Name)`);
        failed_imports++;
        continue;
      }
      try {
        // Check if chemical exists
        const exists = await db.query('SELECT id FROM chemicals WHERE cas_number = $1', [chemical_data.cas_number]);
        if (exists.rows.length > 0) {
          // Update
          const updateFields = ['reg_formatted_id', 'smiles', 'molecular_formula', 'name'];
          const updates = [];
          const values = [];
          let idx = 1;
          for (const field of updateFields) {
            if (chemical_data[field] !== undefined) {
              updates.push(`${field} = $${idx}`);
              values.push(chemical_data[field]);
              idx++;
            }
          }
          if (updates.length > 0) {
            values.push(chemical_data.cas_number);
            await db.query(`UPDATE chemicals SET ${updates.join(', ')} WHERE cas_number = $${values.length}`, values);
          }
          successful_imports++;
        } else {
          // Insert
          const insertQuery = `INSERT INTO chemicals (reg_formatted_id, smiles, cas_number, molecular_formula, name, quantity, unit, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;
          await db.query(insertQuery, [chemical_data.reg_formatted_id, chemical_data.smiles, chemical_data.cas_number, chemical_data.molecular_formula, chemical_data.name, chemical_data.quantity, chemical_data.unit, chemical_data.notes]);
          successful_imports++;
        }
        // SDS download stub
        // sds_downloads++; // Not implemented
      } catch (e) {
        errors.push(`Row ${total_records}: ${e.message}`);
        failed_imports++;
      }
    }
    res.json({
      total_records,
      successful_imports,
      failed_imports,
      sds_downloads,
      errors: errors.slice(0, 10)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bulk-import/template
bulkImportRouter.get('/template', (req, res) => {
  const template = `REG_FORMATTED_ID,Smiles,Cas#,Chemical Formula,IUPAC Name\nERX-0000306,O=Cc1ccncc1,872-85-5,C6H5NO,isonicotinaldehyde\nERX-0000330,Nc1cccc(c1)-c1ccccc1,2243-47-2,C12H11N,(3-biphenylyl)amine`;
  res.json({
    template,
    description: 'CSV template for Dotmatics export. Required columns: REG_FORMATTED_ID, Smiles, Cas#, Chemical Formula, IUPAC Name'
  });
});

module.exports = {
  chemicalsRouter,
  sdsRouter,
  inventoryRouter,
  reportsRouter,
  authRouter,
  bulkImportRouter,
}; 