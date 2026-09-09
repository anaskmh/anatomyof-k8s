// GET /api/jobs
// Query params (all optional):
//   role        exact match on role_type            e.g. role=SRE
//   category    exact match on category             e.g. category=Cloud%20%26%20DevOps
//   country     exact match on country              e.g. country=Saudi%20Arabia
//   experience  exact match on experience           e.g. experience=Mid-Senior
//   status      open (default) | closed | all
//   q           free-text search over title, company, skills, location
//   limit       max rows (default 300, max 500)
// Response: { jobs: [...], total, facets: { roles, categories, countries, experiences } }
//
// Runs as a Vercel serverless function in production and is mounted by the
// Vite dev server in development (see vite.config.js). Uses plain Node
// req/res so the same handler works in both.
import { neon } from '@neondatabase/serverless';

const JOB_COLUMNS = `
  id, category, role_type, title, company, location, country,
  to_char(posted_on, 'YYYY-MM-DD') AS posted_on,
  experience, skills, salary, source, apply_url, status,
  to_char(collected_on, 'YYYY-MM-DD') AS collected_on
`;

export async function queryJobs(params = {}) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not configured');
  const sql = neon(url);

  const where = [];
  const values = [];
  const bind = (v) => { values.push(v); return `$${values.length}`; };

  if (params.role) where.push(`role_type = ${bind(params.role)}`);
  if (params.category) where.push(`category = ${bind(params.category)}`);
  if (params.country) where.push(`country = ${bind(params.country)}`);
  if (params.experience) where.push(`experience = ${bind(params.experience)}`);
  const status = params.status || 'open';
  if (status !== 'all') where.push(`status = ${bind(status)}`);
  if (params.q && params.q.trim()) {
    const p = bind(`%${params.q.trim()}%`);
    where.push(`(title ILIKE ${p} OR company ILIKE ${p} OR coalesce(skills, '') ILIKE ${p} OR coalesce(location, '') ILIKE ${p})`);
  }
  const limit = Math.min(Math.max(parseInt(params.limit, 10) || 300, 1), 500);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [jobs, roles, categories, countries, experiences] = await Promise.all([
    sql.query(
      `SELECT ${JOB_COLUMNS} FROM jobs ${whereSql}
       ORDER BY posted_on DESC NULLS LAST, id ASC LIMIT ${limit}`,
      values,
    ),
    sql.query(`SELECT role_type AS value, count(*)::int AS count FROM jobs WHERE status = 'open' GROUP BY 1 ORDER BY 2 DESC, 1`),
    sql.query(`SELECT category AS value, count(*)::int AS count FROM jobs WHERE status = 'open' GROUP BY 1 ORDER BY 2 DESC, 1`),
    sql.query(`SELECT country AS value, count(*)::int AS count FROM jobs WHERE status = 'open' GROUP BY 1 ORDER BY 2 DESC, 1`),
    sql.query(`SELECT experience AS value, count(*)::int AS count FROM jobs WHERE status = 'open' AND experience IS NOT NULL GROUP BY 1 ORDER BY 2 DESC, 1`),
  ]);

  return { jobs, total: jobs.length, facets: { roles, categories, countries, experiences } };
}

export default async function handler(req, res) {
  const { searchParams } = new URL(req.url, 'http://localhost');
  const params = Object.fromEntries(searchParams.entries());

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  try {
    const data = await queryJobs(params);
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.statusCode = 200;
    res.end(JSON.stringify(data));
  } catch (err) {
    console.error('[api/jobs]', err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Failed to load jobs', detail: err.message }));
  }
}
