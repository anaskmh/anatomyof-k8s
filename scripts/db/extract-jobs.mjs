// Extract job rows (including the hyperlinked apply URLs) from the two PDFs in
// docs/jobs into data/jobs.json. Usage: node scripts/db/extract-jobs.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const COLLECTED_ON = '2026-09-09';
const MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

const SOURCES = [
  {
    file: 'docs/jobs/cloud-devops-jobs-uae-saudi.pdf',
    key: 'cloud-devops',
    category: 'Cloud & DevOps',
    columns: ['num', 'title', 'company', 'location', 'posted', 'experience', 'skills', 'salary', 'source', 'apply'],
  },
  {
    file: 'docs/jobs/software-qa-ai-jobs-uae-saudi.pdf',
    key: 'software-qa-ai',
    category: 'Software & AI',
    columns: ['num', 'roleType', 'title', 'company', 'location', 'posted', 'experience', 'salary', 'source', 'apply'],
  },
];

const ROLE_RULES = [
  [/site reliability|\bSRE\b|reliability/i, 'SRE'],
  [/MLOps/i, 'MLOps'],
  [/DevOps|SysOps/i, 'DevOps'],
  [/OpenShift|Kubernetes/i, 'Kubernetes'],
  [/Platform/i, 'Platform'],
  [/Cloud/i, 'Cloud'],
  [/Security/i, 'Security'],
  [/Data Center|Datacentre|NOC|Automation|HPC/i, 'Infrastructure'],
  [/Infra|Systems? Engineer|System \/|Linux|Nutanix|VMware|Operation/i, 'Infrastructure'],
];
const roleFromTitle = (title, skills) => {
  for (const [re, role] of ROLE_RULES) if (re.test(title) || re.test(skills || '')) return role;
  return 'Infrastructure';
};

const parseDate = (s) => {
  const m = s && s.match(/(\d{1,2})\s+([A-Za-z]{3})(?:\s+(\d{4}))?/);
  if (!m) return null;
  const y = m[3] || COLLECTED_ON.slice(0, 4);
  return `${y}-${String(MONTHS[m[2]]).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
};
const clean = (s) => s.replace(/\s+/g, ' ').replace(/\s*\/\s*/g, ' / ').replace(/\s+-\s+/g, ' - ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').trim();
const nullable = (s) => (!s || s === '-' ? null : s);
const countryFor = (loc) => (/riyadh|jeddah|dammam|dhahran|khobar|makkah|jubail|saudi/i.test(loc) ? 'Saudi Arabia' : 'United Arab Emirates');

async function extract(src) {
  const doc = await getDocument({ url: src.file, useSystemFonts: true }).promise;
  const rows = [];
  let edges = null;
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const [tc, ann] = await Promise.all([page.getTextContent(), page.getAnnotations()]);
    const links = ann.filter((a) => a.subtype === 'Link' && a.url).map((a) => ({ url: a.url, top: a.rect[3], bottom: a.rect[1] })).sort((a, b) => b.top - a.top);
    if (!links.length) continue;
    const items = tc.items.filter((i) => i.str.trim()).map((i) => ({ s: i.str, x: i.transform[4], y: i.transform[5] }));

    if (!edges) {
      // Column left edges come from the first data row (left-aligned cell text).
      const first = links[0];
      const rowItems = items.filter((i) => i.y <= first.top + 1 && i.y >= first.bottom - 1).sort((a, b) => a.x - b.x);
      edges = rowItems.map((i) => i.x);
      if (edges.length !== src.columns.length) throw new Error(`${src.file}: expected ${src.columns.length} columns, found ${edges.length}: ${rowItems.map((i) => i.s).join(' | ')}`);
    }
    const colOf = (x) => { let c = 0; for (let k = 0; k < edges.length; k++) if (x >= edges[k] - 1.5) c = k; return c; };

    links.forEach((link, idx) => {
      const lower = idx + 1 < links.length ? links[idx + 1].top + 0.5 : 40;
      const cells = src.columns.map(() => []);
      items
        .filter((i) => i.y <= link.top + 1 && i.y > lower && !/^Page \d+$/.test(i.s) && !/vacancies - UAE/.test(i.s))
        .sort((a, b) => (Math.abs(a.y - b.y) > 2 ? b.y - a.y : a.x - b.x))
        .forEach((i) => cells[colOf(i.x)].push(i.s));
      const rec = Object.fromEntries(src.columns.map((c, k) => [c, clean(cells[k].join(c === 'num' ? '' : ' '))]));
      rec.applyUrl = link.url;
      rec.page = p;
      rows.push(rec);
    });
  }
  return rows;
}

mkdirSync('data', { recursive: true });
const jobs = [];
for (const src of SOURCES) {
  const rows = await extract(src);
  let country = null;
  let lastNum = 0;
  for (const r of rows) {
    const num = parseInt(r.num, 10);
    // Row numbering restarts at 1 for the Saudi section.
    if (num === 1 && lastNum > 1) country = 'Saudi Arabia';
    if (!country) country = 'United Arab Emirates';
    lastNum = num;
    const location = r.location || null;
    jobs.push({
      external_key: `${src.key}|${country}|${num}`,
      category: src.category,
      role_type: r.roleType ? clean(r.roleType) : roleFromTitle(r.title, r.skills),
      title: r.title,
      company: r.company,
      location,
      country: country || countryFor(location || ''),
      posted_on: parseDate(r.posted),
      experience: nullable(r.experience),
      skills: nullable(r.skills),
      salary: nullable(r.salary),
      source: nullable(r.source),
      apply_url: r.applyUrl,
      status: 'open',
      collected_on: COLLECTED_ON,
    });
  }
  console.log(`${src.file}: ${rows.length} rows`);
}
writeFileSync('data/jobs.json', JSON.stringify(jobs, null, 2) + '\n');
console.log(`wrote data/jobs.json with ${jobs.length} jobs`);
