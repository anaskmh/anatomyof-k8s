// Upsert data/jobs.json into the jobs table. Safe to re-run: rows are matched
// on external_key, so re-seeding updates in place instead of duplicating.
// Usage: node scripts/db/seed-jobs.mjs [--close-missing]
//   --close-missing  mark rows not present in data/jobs.json as status='closed'
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL is not set (see .env.example)'); process.exit(1); }
const sql = neon(url);

const jobs = JSON.parse(readFileSync(new URL('../../data/jobs.json', import.meta.url), 'utf8'));
const closeMissing = process.argv.includes('--close-missing');

const COLS = ['external_key', 'category', 'role_type', 'title', 'company', 'location', 'country', 'posted_on', 'experience', 'skills', 'salary', 'source', 'apply_url', 'status', 'collected_on'];
const CHUNK = 50;
let upserted = 0;

for (let i = 0; i < jobs.length; i += CHUNK) {
  const batch = jobs.slice(i, i + CHUNK);
  const values = [];
  const rows = batch.map((j) => `(${COLS.map((c) => { values.push(j[c] ?? null); return `$${values.length}`; }).join(', ')})`);
  const updates = COLS.filter((c) => c !== 'external_key').map((c) => `${c} = EXCLUDED.${c}`).join(', ');
  const res = await sql.query(
    `INSERT INTO jobs (${COLS.join(', ')}) VALUES ${rows.join(', ')}
     ON CONFLICT (external_key) DO UPDATE SET ${updates}, updated_at = now()`,
    values,
  );
  upserted += batch.length;
}

let closed = 0;
if (closeMissing) {
  const keys = jobs.map((j) => j.external_key);
  const res = await sql.query(`UPDATE jobs SET status = 'closed', updated_at = now() WHERE status = 'open' AND NOT (external_key = ANY($1))`, [keys]);
  closed = res.length ?? 0;
}

const [{ total, open }] = await sql`select count(*)::int as total, count(*) filter (where status = 'open')::int as open from jobs`;
console.log(`upserted ${upserted} jobs${closeMissing ? `, closed ${closed} stale` : ''}. table now has ${total} rows (${open} open).`);
