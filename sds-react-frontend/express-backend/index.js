const express = require('express');
const cors = require('cors');
const path = require('path');
const {
  chemicalsRouter,
  sdsRouter,
  inventoryRouter,
  reportsRouter,
  authRouter,
  bulkImportRouter,
} = require('./routers');

const app = express();
const PORT = process.env.PORT || 6443;

// Request logging middleware to track all API calls
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  // Special debug logging for SDS upload requests
  if (req.url.includes('/sds/upload')) {
    console.log('************************************');
    console.log('**** SDS UPLOAD REQUEST DETECTED ****');
    console.log('************************************');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Content-Type:', req.headers['content-type']);
    
    // We can't log req.body or req.files here because they're not parsed yet
    // That happens in the multer middleware
  }
  next();
});

// Placeholder settings (replace with real config as needed)
const settings = {
  APP_NAME: 'SDS/GHS Management System',
  APP_VERSION: '1.0.0',
  COMPANY_NAME: 'Your Company',
  COMPANY_EMAIL: 'info@company.com',
  GHS_VERSION: 'Rev. 7',
  SDS_SOURCES: ['Source1', 'Source2'],
  MAX_DOWNLOAD_THREADS: 4
};

app.use(cors());
app.use(express.json());

// Serve static files (mimic FastAPI's /static)
app.use('/static', express.static(path.join(__dirname, '../public')));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: `Welcome to ${settings.APP_NAME}`,
    version: settings.APP_VERSION,
    docs: '/api/docs',
    company: settings.COMPANY_NAME,
    frontend: '/static/index.html'
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    app_name: settings.APP_NAME,
    version: settings.APP_VERSION
  });
});

// System info endpoint
app.get('/api/system/info', (req, res) => {
  res.json({
    app_name: settings.APP_NAME,
    version: settings.APP_VERSION,
    company_name: settings.COMPANY_NAME,
    company_email: settings.COMPANY_EMAIL,
    ghs_version: settings.GHS_VERSION,
    sds_sources: settings.SDS_SOURCES,
    max_download_threads: settings.MAX_DOWNLOAD_THREADS
  });
});

// API Docs placeholder
app.get('/api/docs', (req, res) => {
  res.json({
    message: 'API documentation will be available here.',
    endpoints: [
      { path: '/', method: 'GET', description: 'Root endpoint' },
      { path: '/api/health', method: 'GET', description: 'Health check' },
      { path: '/api/system/info', method: 'GET', description: 'System info' },
      { path: '/api/docs', method: 'GET', description: 'API documentation placeholder' },
      { path: '/api/auth', method: 'ALL', description: 'Authentication routes (stub)' },
      { path: '/api/chemicals', method: 'ALL', description: 'Chemicals routes (stub)' },
      { path: '/api/sds', method: 'ALL', description: 'SDS Management routes (stub)' },
      { path: '/api/inventory', method: 'ALL', description: 'Inventory routes (stub)' },
      { path: '/api/reports', method: 'ALL', description: 'Reports routes (stub)' },
      { path: '/api/bulk-import', method: 'ALL', description: 'Bulk Import routes (stub)' }
    ]
  });
});

// Stub routers for main API groups
app.use('/api/auth', authRouter);
app.use('/api/chemicals', chemicalsRouter);
app.use('/api/sds', sdsRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/bulk-import', bulkImportRouter);

// Startup log (mimic FastAPI startup event)
console.log(`Starting ${settings.APP_NAME} v${settings.APP_VERSION}`);
console.log(`Company: ${settings.COMPANY_NAME}`);
console.log(`Server: http://localhost:${PORT}`);
console.log(`API Docs: http://localhost:${PORT}/api/docs`);

app.listen(PORT, () => {
  console.log(`Express backend running on http://localhost:${PORT}`);
});