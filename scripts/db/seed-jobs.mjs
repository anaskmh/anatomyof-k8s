// Upsert data/jobs.json into the jobs table. Safe to re-run: rows are matched
// on external_key, so re-seeding updates in place instead of duplicating.
// Usage: node scripts/db/seed-jobs.mjs [--close-missing]
//   --close-missing  rows not present in data/jobs.json are marked status='closed',
//                    except duplicates of a present job (same posting id or same
//                    title/company/location), which are deleted so they never
//                    show up twice under "all statuses".
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL is not set (see .env.example)'); process.exit(1); }
const sql = neon(url);

const jobs = JSON.parse(readFileSync(new URL('../../data/jobs.json', import.meta.url), 'utf8'));
const closeMissing = process.argv.includes('--close-missing');

const COLS = ['external_key', 'category', 'role_type', 'title', 'company', 'location', 'country', 'posted_on', 'experience', 'employment_type', 'skills', 'salary', 'source', 'apply_url', 'status', 'collected_on'];
const CHUNK = 50;
let upserted = 0;

for (let i = 0; i < jobs.length; i += CHUNK) {
  const batch = jobs.slice(i, i + CHUNK);
  const values = [];
  const rows = batch.map((j) => `(${COLS.map((c) => { values.push(j[c] ?? null); return `$${values.length}`; }).join(', ')})`);
  const updates = COLS.filter((c) => c !== 'external_key').map((c) => `${c} = EXCLUDED.${c}`).join(', ');
  await sql.query(
    `INSERT INTO jobs (${COLS.join(', ')}) VALUES ${rows.join(', ')}
     ON CONFLICT (external_key) DO UPDATE SET ${updates}, updated_at = now()`,
    values,
  );
  upserted += batch.length;
}

// Same identity rules as scripts/db/extract-jobs.mjs.
const jobIdFromUrl = (u) => {
  if (!u) return null;
  const m = u.match(/linkedin\.com\/jobs\/view\/.*?(\d{7,})/) || u.match(/[?&]jk=([a-f0-9]+)/i) || u.match(/naukrigulf\.com\/.*?jid-(\d+)/i);
  return m ? m[1] : u.toLowerCase().replace(/[?#].*$/, '').replace(/\/+$/, '');
};
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const titleKey = (j) => `${norm(j.title)}|${norm(j.company)}|${norm(j.location)}|${j.country}`;

let closed = 0;
let deleted = 0;
if (closeMissing) {
  const keys = new Set(jobs.map((j) => j.external_key));
  const presentIds = new Set(jobs.map((j) => jobIdFromUrl(j.apply_url)));
  const presentTitles = new Set(jobs.map(titleKey));
  const existing = await sql`select external_key, title, company, location, country, apply_url from jobs`;
  const missing = existing.filter((r) => !keys.has(r.external_key));
  const dupKeys = missing.filter((r) => presentIds.has(jobIdFromUrl(r.apply_url)) || presentTitles.has(titleKey(r))).map((r) => r.external_key);
  const staleKeys = missing.map((r) => r.external_key).filter((k) => !dupKeys.includes(k));
  if (dupKeys.length) {
    await sql.query(`DELETE FROM jobs WHERE external_key = ANY($1)`, [dupKeys]);
    deleted = dupKeys.length;
    for (const k of dupKeys) console.log(`deleted duplicate ${k}`);
  }
  if (staleKeys.length) {
    const res = await sql.query(`UPDATE jobs SET status = 'closed', updated_at = now() WHERE status = 'open' AND external_key = ANY($1) RETURNING external_key`, [staleKeys]);
    closed = res.length;
  }
}

const [{ total, open }] = await sql`select count(*)::int as total, count(*) filter (where status = 'open')::int as open from jobs`;
console.log(`upserted ${upserted} jobs${closeMissing ? `, deleted ${deleted} duplicates, closed ${closed} stale` : ''}. table now has ${total} rows (${open} open).`);
