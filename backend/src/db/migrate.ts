import fs from 'fs';
import path from 'path';
import { pool } from '../config/db';

async function migrate() {
  console.log('Starting migration...');
  const schemaPath = path.join(__dirname, 'schema.sql');
  
  try {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schemaSql);
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
