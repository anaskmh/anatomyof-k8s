// Apply scripts/db/schema.sql to the database in DATABASE_URL.
// Usage: node scripts/db/migrate.mjs
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL is not set (see .env.example)'); process.exit(1); }

const sql = neon(url);
const ddl = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
const statements = ddl.split(/;\s*$/m).map((s) => s.trim()).filter(Boolean);
for (const stmt of statements) await sql.query(stmt);
const [{ count }] = await sql`select count(*)::int as count from jobs`;
console.log(`schema applied. jobs table has ${count} rows.`);
