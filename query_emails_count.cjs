const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres' });
pool.query('SELECT count(*) FROM emails').then(res => { console.log(JSON.stringify(res.rows, null, 2)); process.exit(0); }).catch(e => { console.error(e); process.exit(1); });
