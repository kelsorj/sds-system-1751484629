/**
 * PDF Parser for SDS (Safety Data Sheet) files
 * Extracts GHS (Globally Harmonized System) information from PDF documents
 */

const fs = require('fs').promises;
const pdfParse = require('pdf-parse');

/**
 * Extract GHS information from a PDF file
 * @param {string} filePath - Path to the PDF file
 * @returns {Promise<object>} - GHS information
 */
async function extractGhsFromPdf(filePath) {
  try {
    // Initialize GHS info object
    const ghsInfo = {
      signal_word: null,
      hazard_statements: [],
      precautionary_statements: [],
      pictograms: [],
      hazard_classes: [],
      flammable: false,
      explosive: false,
      oxidizing: false,
      toxic: false,
      corrosive: false,
      acute_toxicity: '',
      serious_eye_damage: '',
      skin_corrosion: '',
      reproductive_toxicity: '',
      carcinogenicity: '',
      germ_cell_mutagenicity: '',
      respiratory_sensitization: '',
      aquatic_toxicity: ''
    };

    console.log(`Extracting GHS info from: ${filePath}`);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (err) {
      console.error(`File not found: ${filePath}`);
      return { error: 'File not found' };
    }

    // Read and parse PDF
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    
    // Get all text content
    const text = data.text;
    
    // Normalize whitespace
    const normalizedText = text.replace(/\s+/g, ' ');
    
    // Extract signal word (Danger or Warning)
    const signalWordMatch = normalizedText.match(/Signal word[:\s]+(Danger|Warning)/i);
    if (signalWordMatch) {
      ghsInfo.signal_word = signalWordMatch[1].charAt(0).toUpperCase() + signalWordMatch[1].slice(1).toLowerCase();
    }
    
    // Extract hazard statements (H-codes)
    const hStatementRegex = /(H[2-3][0-9]{2}[^.]*\.)/g;
    const hStatements = [];
    let hMatch;
    while ((hMatch = hStatementRegex.exec(normalizedText)) !== null) {
      hStatements.push(hMatch[1].trim());
    }
    ghsInfo.hazard_statements = Array.from(new Set(hStatements)).sort();
    
    // Extract precautionary statements (P-codes)
    const pStatementRegex = /(P[1-9][0-9]{2}[^.]*\.)/g;
    const pStatements = [];
    let pMatch;
    while ((pMatch = pStatementRegex.exec(normalizedText)) !== null) {
      pStatements.push(pMatch[1].trim());
    }
    ghsInfo.precautionary_statements = Array.from(new Set(pStatements)).sort();
    
    // Extract GHS pictograms (e.g., GHS02, GHS07, GHS08)
    const pictogramRegex = /(GHS[0-9]{2})/g;
    const pictograms = [];
    let pictoMatch;
    while ((pictoMatch = pictogramRegex.exec(normalizedText)) !== null) {
      pictograms.push(pictoMatch[1].trim());
    }
    ghsInfo.pictograms = Array.from(new Set(pictograms)).sort();
    
    // Extract hazard classes (e.g., Flam. Liq. 2, Carc. 1A, Eye Irrit. 2)
    const hazardClassRegex = /([A-Z][a-zA-Z. ]+\s[1-3][A-B]?)/g;
    const hazardClasses = [];
    let hcMatch;
    while ((hcMatch = hazardClassRegex.exec(normalizedText)) !== null) {
      const hc = hcMatch[1].trim();
      if (hc.length > 3) {
        hazardClasses.push(hc);
      }
    }
    ghsInfo.hazard_classes = Array.from(new Set(hazardClasses)).sort();
    
    // Extract specific hazard properties based on text
    if (normalizedText.match(/flammable|combustible/i)) {
      ghsInfo.flammable = true;
    }
    
    if (normalizedText.match(/explosive|explosion/i)) {
      ghsInfo.explosive = true;
    }
    
    if (normalizedText.match(/oxidiz(ing|er)|oxidation/i)) {
      ghsInfo.oxidizing = true;
    }
    
    if (normalizedText.match(/toxic|toxicity|poison/i)) {
      ghsInfo.toxic = true;
    }
    
    if (normalizedText.match(/corrosive|corrosion/i)) {
      ghsInfo.corrosive = true;
    }
    
    // Additional GHS hazard categories
    const acuteToxMatch = normalizedText.match(/acute tox(icity)?\s*(\w+)/i);
    if (acuteToxMatch) {
      ghsInfo.acute_toxicity = acuteToxMatch[0].trim();
    }
    
    const eyeDamageMatch = normalizedText.match(/serious eye (damage|irritation)\s*(\w+)/i);
    if (eyeDamageMatch) {
      ghsInfo.serious_eye_damage = eyeDamageMatch[0].trim();
    }
    
    const skinCorrMatch = normalizedText.match(/skin corr(osion)?\s*(\w+)/i);
    if (skinCorrMatch) {
      ghsInfo.skin_corrosion = skinCorrMatch[0].trim();
    }
    
    const reproToxMatch = normalizedText.match(/reproductive tox(icity)?\s*(\w+)/i);
    if (reproToxMatch) {
      ghsInfo.reproductive_toxicity = reproToxMatch[0].trim();
    }
    
    const carcinoMatch = normalizedText.match(/carcinogen(icity)?\s*(\w+)/i);
    if (carcinoMatch) {
      ghsInfo.carcinogenicity = carcinoMatch[0].trim();
    }
    
    const mutagenicityMatch = normalizedText.match(/mutagen(icity)?\s*(\w+)/i);
    if (mutagenicityMatch) {
      ghsInfo.germ_cell_mutagenicity = mutagenicityMatch[0].trim();
    }
    
    const respSensMatch = normalizedText.match(/respiratory sensitization\s*(\w+)/i);
    if (respSensMatch) {
      ghsInfo.respiratory_sensitization = respSensMatch[0].trim();
    }
    
    const aquaticToxMatch = normalizedText.match(/aquatic tox(icity)?\s*(\w+)/i);
    if (aquaticToxMatch) {
      ghsInfo.aquatic_toxicity = aquaticToxMatch[0].trim();
    }

    console.log('GHS extraction completed successfully');
    return ghsInfo;
  } catch (error) {
    console.error('Error extracting GHS info:', error);
    return { error: error.message };
  }
}

/**
 * Ensures that the ghs_classifications table exists in the database
 * @param {object} db - Database connection object
 */
async function ensureGhsClassificationsTable(db) {
  try {
    const tableExists = await db.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ghs_classifications')`
    );
    
    if (!tableExists.rows[0].exists) {
      console.log('Creating ghs_classifications table...');
      await db.query(`
        CREATE TABLE ghs_classifications (
          id SERIAL PRIMARY KEY,
          chemical_id INTEGER NOT NULL,
          classification_source TEXT,
          signal_word TEXT,
          classified_at TIMESTAMP DEFAULT NOW(),
          flammable BOOLEAN DEFAULT false,
          explosive BOOLEAN DEFAULT false,
          oxidizing BOOLEAN DEFAULT false,
          toxic BOOLEAN DEFAULT false,
          corrosive BOOLEAN DEFAULT false,
          acute_toxicity TEXT,
          serious_eye_damage TEXT,
          skin_corrosion TEXT,
          reproductive_toxicity TEXT,
          carcinogenicity TEXT,
          germ_cell_mutagenicity TEXT,
          respiratory_sensitization TEXT,
          aquatic_toxicity TEXT,
          hazard_statements JSONB,
          precautionary_statements JSONB,
          pictograms JSONB,
          hazard_classes JSONB,
          FOREIGN KEY (chemical_id) REFERENCES chemicals(id)
        )
      `);
      console.log('ghs_classifications table created successfully');
    }
  } catch (error) {
    console.error('Error ensuring ghs_classifications table:', error);
    throw error;
  }
}

/**
 * Extract GHS info from a PDF and store in the database
 * @param {string} casNumber - Chemical CAS number
 * @param {string} filePath - Path to the PDF file
 * @param {object} db - Database connection object
 */
async function extractAndStoreGhsFromPdf(casNumber, filePath, db) {
  try {
    console.log(`Extracting GHS info for CAS ${casNumber} from ${filePath}`);
    
    // Make sure the table exists
    await ensureGhsClassificationsTable(db);
    
    // Extract GHS information
    const ghsInfo = await extractGhsFromPdf(filePath);
    if (ghsInfo.error) {
      return { success: false, error: ghsInfo.error };
    }
    
    // Find the chemical ID
    const chemicalResult = await db.query(
      'SELECT id FROM chemicals WHERE cas_number = $1',
      [casNumber]
    );
    
    if (chemicalResult.rows.length === 0) {
      return { success: false, error: 'Chemical not found' };
    }
    
    const chemicalId = chemicalResult.rows[0].id;
    
    // Remove any existing GHS classifications for this chemical
    await db.query(
      'DELETE FROM ghs_classifications WHERE chemical_id = $1',
      [chemicalId]
    );
    
    // Insert new GHS classification
    const result = await db.query(
      `INSERT INTO ghs_classifications (
        chemical_id,
        classification_source,
        signal_word,
        classified_at,
        flammable,
        explosive,
        oxidizing,
        toxic,
        corrosive,
        acute_toxicity,
        serious_eye_damage,
        skin_corrosion,
        reproductive_toxicity,
        carcinogenicity,
        germ_cell_mutagenicity,
        respiratory_sensitization,
        aquatic_toxicity,
        hazard_statements,
        precautionary_statements,
        pictograms,
        hazard_classes
      ) VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING id`,
      [
        chemicalId,
        'pdf_extraction',
        ghsInfo.signal_word,
        ghsInfo.flammable,
        ghsInfo.explosive,
        ghsInfo.oxidizing,
        ghsInfo.toxic,
        ghsInfo.corrosive,
        ghsInfo.acute_toxicity,
        ghsInfo.serious_eye_damage,
        ghsInfo.skin_corrosion,
        ghsInfo.reproductive_toxicity,
        ghsInfo.carcinogenicity,
        ghsInfo.germ_cell_mutagenicity,
        ghsInfo.respiratory_sensitization,
        ghsInfo.aquatic_toxicity,
        JSON.stringify(ghsInfo.hazard_statements),
        JSON.stringify(ghsInfo.precautionary_statements),
        JSON.stringify(ghsInfo.pictograms),
        JSON.stringify(ghsInfo.hazard_classes)
      ]
    );
    
    const insertedId = result.rows[0].id;
    console.log(`Inserted GHS classification with ID ${insertedId}`);
    
    return {
      success: true,
      ghs_classification_id: insertedId,
      ghs_info: ghsInfo
    };
  } catch (error) {
    console.error('Error extracting and storing GHS info:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  extractGhsFromPdf,
  extractAndStoreGhsFromPdf,
  ensureGhsClassificationsTable
};
