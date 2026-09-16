// Extract job rows (including the hyperlinked apply URLs) from the PDFs in
// docs/jobs into data/jobs.json, merging duplicates that appear in more than
// one PDF or on more than one job site. Usage: node scripts/db/extract-jobs.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

// Two PDF layouts are supported:
//   numbered  one table per country with a leading row number column
//   daily     "Daily Job Report": sections headed "<Source> — <Country> - <Group> (n)"
//             with columns Role | Company | Location | Posted | Type / Level | Apply link
//   scrape    "Job Scrape": sections headed "1. Best match for you", "2. Close to your
//             skills", "3. Other results ..." with columns Job title | Company | Location |
//             Posted | Type | Contact. The title is the apply link; the Contact cell links
//             to the recruiter's LinkedIn profile or a mailto: address.
// Keep older batches first so existing rows keep their external_key when a
// newer PDF lists the same job again.
const SOURCES = [
  {
    file: 'docs/jobs/cloud-devops-jobs-uae-saudi.pdf',
    key: 'cloud-devops',
    layout: 'numbered',
    collectedOn: '2026-09-09',
    category: 'Cloud & DevOps',
    columns: ['num', 'title', 'company', 'location', 'posted', 'experience', 'skills', 'salary', 'source', 'apply'],
  },
  {
    file: 'docs/jobs/software-qa-ai-jobs-uae-saudi.pdf',
    key: 'software-qa-ai',
    layout: 'numbered',
    collectedOn: '2026-09-09',
    category: 'Software & AI',
    columns: ['num', 'roleType', 'title', 'company', 'location', 'posted', 'experience', 'salary', 'source', 'apply'],
  },
  {
    file: 'docs/jobs/daily-job-report-2026-09-10.pdf',
    key: 'daily-2026-09-10',
    layout: 'daily',
    collectedOn: '2026-09-10',
    columns: ['title', 'company', 'location', 'posted', 'typeLevel', 'apply'],
  },
  {
    file: 'docs/jobs/jobs-uae-ksa-2026-09-10-11.pdf',
    key: 'scrape-2026-09-11',
    layout: 'scrape',
    collectedOn: '2026-09-11',
    columns: ['title', 'company', 'location', 'posted', 'employmentType', 'contact'],
  },
  {
    file: 'docs/jobs/jobs-uae-ksa-2026-09-11-14.pdf',
    key: 'scrape-2026-09-14',
    layout: 'scrape',
    collectedOn: '2026-09-14',
    columns: ['title', 'company', 'location', 'posted', 'employmentType', 'contact'],
  },
  {
    file: 'docs/jobs/jobs-uae-ksa-2026-09-14-16.pdf',
    key: 'scrape-2026-09-16',
    layout: 'scrape',
    collectedOn: '2026-09-16',
    columns: ['title', 'company', 'location', 'posted', 'employmentType', 'contact'],
  },
];

// ---------------------------------------------------------------- classification
const CLOUD_ROLES = new Set(['DevOps', 'SRE', 'Platform', 'Cloud', 'Kubernetes', 'Infrastructure', 'Security', 'MLOps']);
const INFRA_RULES = [
  [/site reliability|\bSRE\b|reliability/i, 'SRE'],
  [/MLOps/i, 'MLOps'],
  [/DevOps|SysOps/i, 'DevOps'],
  [/OpenShift|Kubernetes|Containeri[sz]ation/i, 'Kubernetes'],
  [/Platform/i, 'Platform'],
  [/Cloud|Solutions? Architect|Customer Engineer|Technical Account Manager/i, 'Cloud'],
  [/Security|Vulnerability/i, 'Security'],
  [/Data Center|Datacentre|NOC|Automation|HPC/i, 'Infrastructure'],
  [/Infra|Systems? Engineer|System \/|Linux|Nutanix|VMware|Operation|Network/i, 'Infrastructure'],
];
const SOFTWARE_RULES = [
  [/MLOps/i, 'MLOps'],
  [/\bAI\b|Artificial Intelligence|Machine Learning|\bML\b|Agentic|Generative|LLM|Data Scien/i, 'AI / ML'],
  [/\bQA\b|Quality|Test/i, 'QA / Testing'],
  [/Scrum|Agile|Product Owner|Project Manager/i, 'Scrum / Agile'],
  [/Security|Vulnerability/i, 'Security'],
  [/Network|System Administrator|Linux|Infrastructure/i, 'Infrastructure'],
  [/Front-?end|React|Angular|Vue|Mobile|iOS|Android|Flutter/i, 'Frontend'],
  [/Back-?end|Laravel|Python|\bGo\b|Golang|Java\b|\.Net\b|Dotnet|Node|\bAPI\b|Microservices|Middleware|Integration/i, 'Backend'],
  [/Software Engineer|Developer|Full[- ]?Stack/i, 'Software Eng'],
];
const GROUP_RULES = {
  infra: { rules: [...INFRA_RULES, ...SOFTWARE_RULES], fallback: 'Infrastructure' },
  ai: { rules: [[/MLOps/i, 'MLOps']], fallback: 'AI / ML' },
  software: { rules: SOFTWARE_RULES, fallback: 'Software Eng' },
  any: { rules: [...INFRA_RULES, ...SOFTWARE_RULES], fallback: 'Software Eng' },
};
const roleFor = (group, title, skills) => {
  const { rules, fallback } = GROUP_RULES[group];
  for (const [re, role] of rules) if (re.test(title) || re.test(skills || '')) return role;
  return fallback;
};
const groupFor = (sectionGroup) => {
  if (!sectionGroup) return 'any';
  if (/DevOps|SRE|Platform|Cloud|Infra/i.test(sectionGroup)) return 'infra';
  if (/\bAI\b|\bML\b/i.test(sectionGroup)) return 'ai';
  return 'software';
};
const categoryFor = (role) => (CLOUD_ROLES.has(role) ? 'Cloud & DevOps' : 'Software & AI');

// Split "Full-time / Mid-Senior", "Contract", "7-14 yrs" or "-" into
// { employmentType, experience } using the same level names as the older PDFs.
const LEVELS = { entry: 'Entry level', 'entry level': 'Entry level', associate: 'Associate', 'mid-senior': 'Mid-Senior', 'mid-senior level': 'Mid-Senior', director: 'Director', executive: 'Director', internship: 'Internship' };
const parseTypeLevel = (s) => {
  const out = { employmentType: null, experience: null };
  if (!s || s === '-') return out;
  for (const part of s.split('/').map((p) => p.trim()).filter(Boolean)) {
    const lvl = LEVELS[part.toLowerCase()];
    const yrs = part.match(/^(\d+)\s*-\s*\d+\s*yrs?$/i);
    if (lvl) out.experience = lvl;
    else if (yrs) out.experience = +yrs[1] < 2 ? 'Entry level' : +yrs[1] < 5 ? 'Associate' : 'Mid-Senior';
    else if (/full-?time|part-?time|contract|temporary|internship|freelance/i.test(part)) out.employmentType = part.replace(/^internship$/i, 'Internship');
  }
  return out;
};

// ---------------------------------------------------------------- helpers
const parseDate = (s, collectedOn) => {
  const m = s && s.match(/(\d{1,2})\s+([A-Za-z]{3})(?:\s+(\d{4}))?/);
  if (!m) return null;
  const y = m[3] || collectedOn.slice(0, 4);
  return `${y}-${String(MONTHS[m[2]]).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
};
const clean = (s) => s.replace(/\s+/g, ' ').replace(/\s*\/\s*/g, ' / ').replace(/\s+-\s+/g, ' - ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').trim();
const nullable = (s) => (!s || s === '-' ? null : s);
const COUNTRY_NAMES = { uae: 'United Arab Emirates', 'united arab emirates': 'United Arab Emirates', 'saudi arabia': 'Saudi Arabia', ksa: 'Saudi Arabia' };
const countryFor = (loc) => (/riyadh|jeddah|dammam|dhahran|khobar|makkah|jubail|ahsa|saudi/i.test(loc) ? 'Saudi Arabia' : 'United Arab Emirates');

const SECTION_RE = /^(.+?)\s+—\s+(.+?)(?:\s+-\s+(.+?))?\s+\((\d+)\)$/;

// Page items and link annotations, both sorted top-to-bottom.
async function readPage(doc, p) {
  const page = await doc.getPage(p);
  const [tc, ann] = await Promise.all([page.getTextContent(), page.getAnnotations()]);
  const links = ann.filter((a) => a.subtype === 'Link' && a.url).map((a) => ({ url: a.url, top: a.rect[3], bottom: a.rect[1] })).sort((a, b) => b.top - a.top);
  const items = tc.items.filter((i) => i.str.trim()).map((i) => ({ s: i.str, x: i.transform[4], y: i.transform[5] }));
  return { links, items };
}
const rowSort = (a, b) => (Math.abs(a.y - b.y) > 2 ? b.y - a.y : a.x - b.x);
const cellsFor = (items, columns, edges) => {
  const colOf = (x) => { let c = 0; for (let k = 0; k < edges.length; k++) if (x >= edges[k] - 1.5) c = k; return c; };
  const cells = columns.map(() => []);
  items.sort(rowSort).forEach((i) => cells[colOf(i.x)].push(i.s));
  return Object.fromEntries(columns.map((c, k) => [c, clean(cells[k].join(c === 'num' ? '' : ' '))]));
};

// ---------------------------------------------------------------- numbered layout
async function extractNumbered(doc, src) {
  const rows = [];
  let edges = null;
  for (let p = 1; p <= doc.numPages; p++) {
    const { links, items } = await readPage(doc, p);
    if (!links.length) continue;
    if (!edges) {
      // Column left edges come from the first data row (left-aligned cell text).
      const first = links[0];
      const rowItems = items.filter((i) => i.y <= first.top + 1 && i.y >= first.bottom - 1).sort((a, b) => a.x - b.x);
      edges = rowItems.map((i) => i.x);
      if (edges.length !== src.columns.length) throw new Error(`${src.file}: expected ${src.columns.length} columns, found ${edges.length}: ${rowItems.map((i) => i.s).join(' | ')}`);
    }
    links.forEach((link, idx) => {
      const lower = idx + 1 < links.length ? links[idx + 1].top + 0.5 : 40;
      const band = items.filter((i) => i.y <= link.top + 1 && i.y > lower && !/^Page \d+$/.test(i.s) && !/vacancies - UAE/.test(i.s));
      rows.push({ ...cellsFor(band, src.columns, edges), applyUrl: link.url, page: p });
    });
  }
  const jobs = [];
  let country = null;
  let lastNum = 0;
  for (const r of rows) {
    const num = parseInt(r.num, 10);
    // Row numbering restarts at 1 for the Saudi section.
    if (num === 1 && lastNum > 1) country = 'Saudi Arabia';
    if (!country) country = 'United Arab Emirates';
    lastNum = num;
    const location = r.location || null;
    const role_type = r.roleType ? clean(r.roleType) : roleFor('infra', r.title, r.skills);
    jobs.push({
      external_key: `${src.key}|${country}|${num}`,
      category: src.category,
      role_type,
      title: r.title,
      company: r.company,
      location,
      country: country || countryFor(location || ''),
      posted_on: parseDate(r.posted, src.collectedOn),
      experience: nullable(r.experience),
      employment_type: null,
      skills: nullable(r.skills),
      salary: nullable(r.salary),
      source: nullable(r.source),
      apply_url: r.applyUrl,
      contact_name: null,
      contact_email: null,
      contact_url: null,
      status: 'open',
      collected_on: src.collectedOn,
    });
  }
  return jobs;
}

// ---------------------------------------------------------------- daily layout
async function extractDaily(doc, src) {
  const jobs = [];
  let edges = null;
  let section = null; // { source, country, group }
  const counters = {}; // row number per source + country, so keys stay unique across groups
  const isSectionHeader = (s) => SECTION_RE.test(s.trim());
  const isStructural = (i) => isSectionHeader(i.s) || /^Notes:/.test(i.s) || i.s.trim() === 'Role';

  for (let p = 1; p <= doc.numPages; p++) {
    const { links, items } = await readPage(doc, p);
    if (!edges) {
      const header = items.find((i) => i.s.trim() === 'Role');
      if (header) {
        edges = items.filter((i) => Math.abs(i.y - header.y) < 2).sort((a, b) => a.x - b.x).map((i) => i.x);
        if (edges.length !== src.columns.length) throw new Error(`${src.file}: expected ${src.columns.length} columns, found ${edges.length}`);
      }
    }
    const sectionAt = (y) => {
      // The latest section header above this row (on this page), else the one carried over.
      const above = items.filter((i) => i.y > y && isSectionHeader(i.s)).sort((a, b) => a.y - b.y)[0];
      if (!above) return section;
      const [, source, country, group] = above.s.trim().match(SECTION_RE);
      return { source: clean(source), country: COUNTRY_NAMES[country.trim().toLowerCase()] || country.trim(), group: group ? clean(group) : null, id: `${p}:${above.y}` };
    };

    links.forEach((link, idx) => {
      const sec = sectionAt(link.top);
      if (!sec) throw new Error(`${src.file} p${p}: link without a section header`);
      section = sec;
      const cKey = `${section.source}|${section.country}`;
      const n = (counters[cKey] = (counters[cKey] || 0) + 1);
      const lower = idx + 1 < links.length ? links[idx + 1].top + 0.5 : 40;
      // Stop the row band at the first section/column header or note below the row.
      const band = items.filter((i) => i.y <= link.top + 1 && i.y > lower).sort(rowSort);
      const cut = band.findIndex(isStructural);
      const rowItems = (cut === -1 ? band : band.slice(0, cut)).filter((i) => !/^Page \d+$/.test(i.s));
      const r = cellsFor(rowItems, src.columns, edges);
      const { employmentType, experience } = parseTypeLevel(r.typeLevel);
      const role_type = roleFor(groupFor(section.group), r.title);
      const location = r.location || null;
      jobs.push({
        external_key: `${src.key}|${section.source}|${section.country}|${n}`,
        category: categoryFor(role_type),
        role_type,
        title: r.title,
        company: r.company,
        location,
        country: section.country || countryFor(location || ''),
        posted_on: parseDate(r.posted, src.collectedOn),
        experience,
        employment_type: employmentType,
        skills: null,
        salary: null,
        source: section.source,
        apply_url: link.url,
        contact_name: null,
        contact_email: null,
        contact_url: null,
        status: 'open',
        collected_on: src.collectedOn,
      });
    });
  }
  return jobs;
}

// ---------------------------------------------------------------- scrape layout
const SCRAPE_SECTION_RE = /^(\d+)\.\s+(.+)$/;
const SCRAPE_COUNTRIES = { UAE: 'United Arab Emirates', KSA: 'Saudi Arabia' };
const CONTACT_NOISE = /recruiter on LinkedIn|apply on (?:LinkedIn|Indeed) page|no email listed/gi;
const sourceFromUrl = (url) => (/linkedin\.com/i.test(url) ? 'LinkedIn' : /indeed\.com/i.test(url) ? 'Indeed' : /naukrigulf\.com/i.test(url) ? 'Naukri Gulf' : null);
// "UAE Dubai, UAE" -> { country, location: 'Dubai' }; "KSA Saudi Arabia" -> location 'Saudi Arabia'.
const parseScrapeLocation = (s) => {
  const m = (s || '').match(/^(UAE|KSA)\s*(.*)$/);
  const country = m ? SCRAPE_COUNTRIES[m[1]] : countryFor(s || '');
  let loc = clean((m ? m[2] : s || '').replace(/,?\s*(UAE|KSA)$/i, '')).replace(/\s+Region$/i, '');
  if (/^united arab emirates$/i.test(loc)) loc = 'UAE';
  return { country, location: loc || null };
};

async function extractScrape(doc, src) {
  const jobs = [];
  const counters = {}; // row number per country
  let section = null; // { title, group }
  let edges = null;
  const isSectionHeader = (i) => i.x < 36 && SCRAPE_SECTION_RE.test(i.s.trim());
  const isColumnHeader = (i) => i.s.trim() === 'Job title';
  const isFooter = (i) => /^Page \d+ of \d+$/.test(i.s) || /^Every job title is a clickable link/.test(i.s);
  const isStructural = (i) => isSectionHeader(i) || isColumnHeader(i) || isFooter(i);
  // Plain-text copy of the apply link printed under each title.
  const isUrlText = (s) => /^(?:[a-z]{2,3}\.)?(?:linkedin\.com|indeed\.com|naukrigulf\.com)\b/i.test(s) || /^jk=[a-f0-9]+$/i.test(s);
  // "Round 2" reports tag postings already listed in the previous PDF.
  const isBadge = (s) => /^seen before$/i.test(s.trim());
  const groupForSection = (n) => (n === 1 ? 'infra' : 'any');

  for (let p = 1; p <= doc.numPages; p++) {
    const { links, items } = await readPage(doc, p);
    const isJobLink = (l) => !/^mailto:/i.test(l.url) && !/linkedin\.com\/in\//i.test(l.url);
    // A title wraps over several lines, each carrying its own link annotation; merge contiguous ones.
    const rows = [];
    for (const l of links.filter(isJobLink)) {
      const prev = rows[rows.length - 1];
      if (prev && prev.url === l.url && prev.bottom - l.top < 3) prev.bottom = l.bottom;
      else rows.push({ url: l.url, top: l.top, bottom: l.bottom });
    }
    const contactLinks = links.filter((l) => !isJobLink(l));

    rows.forEach((row, idx) => {
      const above = items.filter((i) => i.y > row.top && (isSectionHeader(i) || isColumnHeader(i))).sort((a, b) => a.y - b.y);
      const sec = above.find(isSectionHeader);
      if (sec) {
        const [, n, title] = sec.s.trim().match(SCRAPE_SECTION_RE);
        section = { title: clean(title), group: groupForSection(+n) };
      }
      const header = above.find(isColumnHeader);
      if (header) {
        edges = items.filter((i) => Math.abs(i.y - header.y) < 2).sort((a, b) => a.x - b.x).map((i) => i.x);
        if (edges.length !== src.columns.length) throw new Error(`${src.file} p${p}: expected ${src.columns.length} columns, found ${edges.length}`);
      }
      if (!section || !edges) throw new Error(`${src.file} p${p}: row without a section or column header`);

      const lower = idx + 1 < rows.length ? rows[idx + 1].top + 0.5 : 0;
      const band = items.filter((i) => i.y <= row.top + 1 && i.y > lower).sort(rowSort);
      const cut = band.findIndex(isStructural);
      const rowItems = (cut === -1 ? band : band.slice(0, cut)).filter((i) => !isUrlText(i.s) && !isBadge(i.s));
      const r = cellsFor(rowItems, src.columns, edges);
      const { country, location } = parseScrapeLocation(r.location);
      const rowContacts = contactLinks.filter((l) => l.top <= row.top + 1 && l.top > lower);
      const mail = rowContacts.find((l) => /^mailto:/i.test(l.url));
      const profile = rowContacts.find((l) => /linkedin\.com\/in\//i.test(l.url));
      const contactText = clean((r.contact || '').replace(CONTACT_NOISE, ''));
      const contact_email = mail ? mail.url.replace(/^mailto:/i, '').trim().toLowerCase() : (contactText.match(/[\w.+-]+@[\w.-]+\.\w+/) || [null])[0];
      const contact_name = !contact_email && contactText ? contactText : null;
      const contact_url = profile ? profile.url.replace(/[?#].*$/, '') : null;
      const title = r.title.replace(/(\w)- (\w)/g, '$1-$2'); // "Forward- Deployed" wrapped at the hyphen
      const role_type = roleFor(section.group, title);
      const n = (counters[country] = (counters[country] || 0) + 1);
      jobs.push({
        external_key: `${src.key}|${country}|${n}`,
        category: categoryFor(role_type),
        role_type,
        title,
        company: r.company,
        location,
        country,
        posted_on: parseDate(r.posted, src.collectedOn),
        experience: null,
        employment_type: nullable(clean(r.employmentType || '')),
        skills: null,
        salary: null,
        source: sourceFromUrl(row.url),
        apply_url: row.url,
        contact_name,
        contact_email,
        contact_url,
        status: 'open',
        collected_on: src.collectedOn,
      });
    });
  }
  return jobs;
}

// ---------------------------------------------------------------- dedupe
// A posting is the same job if it shares a job-site id (LinkedIn numeric id,
// Indeed jk, Naukri jid) or the same title, company, location and country.
export const jobIdFromUrl = (url) => {
  if (!url) return null;
  const m = url.match(/linkedin\.com\/jobs\/view\/.*?(\d{7,})/) || url.match(/[?&]jk=([a-f0-9]+)/i) || url.match(/naukrigulf\.com\/.*?jid-(\d+)/i);
  return m ? m[1] : url.toLowerCase().replace(/[?#].*$/, '').replace(/\/+$/, '');
};
const norm = (s) => (s || '').toLowerCase().replace(/^the\s+/, '').replace(/\b(group|llc|ltd|limited|inc|fzc|fz-llc|plc|company)\b/g, '').replace(/\badministrator\b/g, 'admin').replace(/\bsr\.?\s/g, 'senior ').replace(/[^a-z0-9]+/g, ' ').trim();
// Same employer under different names across job sites.
const COMPANY_ALIASES = { gsstech: 'global software solutions', 'global software solutions gsstech': 'global software solutions', 'emirates group': 'emirates' };
const normCompany = (s) => { const n = norm(s); return COMPANY_ALIASES[n] || n; };
// Title words are sorted so "SRE (Site Reliability Engineer)" matches "Site Reliability Engineer (SRE)".
const titleKey = (j) => `${norm(j.title).split(' ').sort().join(' ')}|${normCompany(j.company)}|${norm(j.location)}|${j.country}`;
const mergeSource = (a, b) => {
  const parts = new Set([...(a || '').split(/\s*\+\s*/), ...(b || '').split(/\s*\+\s*/)].filter(Boolean));
  return [...parts].join(' + ') || null;
};

function dedupe(jobs) {
  const byId = new Map();
  const byTitle = new Map();
  const kept = [];
  const dropped = [];
  for (const job of jobs) {
    const id = jobIdFromUrl(job.apply_url);
    const existing = byId.get(id) || byTitle.get(titleKey(job));
    if (existing) {
      const reason = byId.get(id) ? 'same job id' : 'same title/company/location';
      // Keep the first (older) record and its external_key; fill gaps from the newer one.
      existing.source = mergeSource(existing.source, job.source);
      for (const f of ['experience', 'employment_type', 'skills', 'salary', 'location', 'contact_name', 'contact_email', 'contact_url']) if (existing[f] == null && job[f] != null) existing[f] = job[f];
      if (job.posted_on && (!existing.posted_on || job.posted_on < existing.posted_on)) existing.posted_on = job.posted_on;
      if (job.collected_on > existing.collected_on) existing.collected_on = job.collected_on;
      dropped.push({ job, keptKey: existing.external_key, reason });
      continue;
    }
    byId.set(id, job);
    byTitle.set(titleKey(job), job);
    kept.push(job);
  }
  return { kept, dropped };
}

// ---------------------------------------------------------------- main
mkdirSync('data', { recursive: true });
const all = [];
for (const src of SOURCES) {
  const doc = await getDocument({ url: src.file, useSystemFonts: true }).promise;
  const jobs = src.layout === 'daily' ? await extractDaily(doc, src) : src.layout === 'scrape' ? await extractScrape(doc, src) : await extractNumbered(doc, src);
  console.log(`${src.file}: ${jobs.length} rows`);
  all.push(...jobs);
}
const { kept, dropped } = dedupe(all);
if (dropped.length) {
  console.log(`\nmerged ${dropped.length} duplicate posting${dropped.length === 1 ? '' : 's'}:`);
  for (const { job, keptKey, reason } of dropped) console.log(`  ${job.external_key.padEnd(52)} -> ${keptKey.padEnd(40)} ${reason}  (${job.title} @ ${job.company})`);
}
writeFileSync('data/jobs.json', JSON.stringify(kept, null, 2) + '\n');
console.log(`\nwrote data/jobs.json with ${kept.length} jobs (${all.length} rows extracted)`);
