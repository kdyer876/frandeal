// scripts/migrate.js
// Runs every db/*.sql file in order against DATABASE_URL.
// Safe to re-run — all migrations are idempotent.

require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function migrate() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log('Connected to database.');

  const dbDir = path.join(__dirname, '..', 'db');
  const files = fs.readdirSync(dbDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const filePath = path.join(dbDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    process.stdout.write(`Running ${file}... `);
    await client.query(sql);
    console.log('done');
  }

  await client.end();
  console.log('\nAll migrations complete.');
}

migrate().catch(err => {
  console.error('\nMigration failed:', err.message);
  process.exit(1);
});
