const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST || 'ekmbalps1.corp.eikontx.com',
  port: process.env.PGPORT || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'postgres',
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
}; 