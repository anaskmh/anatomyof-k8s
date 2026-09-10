import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Search, RefreshCw, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';

const MONO = "'JetBrains Mono', monospace";
const SERIF = "'Space Grotesk', sans-serif";

const ROLE_COLORS = {
  'DevOps': '#2563eb',
  'SRE': '#dc2626',
  'Platform': '#7c3aed',
  'Cloud': '#ea580c',
  'Kubernetes': '#326ce5',
  'Infrastructure': '#0d9488',
  'Security': '#059669',
  'MLOps': '#db2777',
  'Software Eng': '#1d4ed8',
  'Frontend': '#7c3aed',
  'Backend': '#059669',
  'QA / Testing': '#d97706',
  'Scrum / Agile': '#0891b2',
  'AI / ML': '#dc2626',
};
const roleColor = (r) => ROLE_COLORS[r] || '#5c5a6f';

const EMPTY_FILTERS = { role: '', category: '', country: '', experience: '', q: '', status: 'open' };
const PAGE_SIZE = 25;

const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
};

const selectStyle = {
  appearance: 'none',
  WebkitAppearance: 'none',
  padding: '9px 32px 9px 12px',
  borderRadius: 8,
  border: '1px solid #dcdad4',
  background: '#fff url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'6\' viewBox=\'0 0 10 6\'><path d=\'M1 1l4 4 4-4\' fill=\'none\' stroke=\'%238a8270\' stroke-width=\'1.5\'/></svg>") no-repeat right 12px center',
  fontFamily: MONO,
  fontSize: 11.5,
  color: '#1a1a2e',
  cursor: 'pointer',
  outline: 'none',
  minWidth: 150,
};

function FacetSelect({ label, value, onChange, options, allLabel }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#9391a0', paddingLeft: 4 }}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={selectStyle}>
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.value} ({o.count})</option>
        ))}
      </select>
    </label>
  );
}

export default function JobsBoard({ accent = '#326ce5' }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [qDraft, setQDraft] = useState('');
  const [data, setData] = useState({ jobs: [], total: 0, facets: { roles: [], categories: [], countries: [], experiences: [] } });
  const [state, setState] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);

  // Debounce the free-text search into the filters.
  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => (f.q === qDraft ? f : { ...f, q: qDraft })), 300);
    return () => clearTimeout(t);
  }, [qDraft]);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) p.set(k, v); });
    p.set('limit', '1000'); // paginate client-side; never truncate the board
    return p.toString();
  }, [filters]);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    fetch(`/api/jobs?${queryString}`)
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.detail || body.error || `HTTP ${r.status}`);
        return body;
      })
      .then((body) => { if (!cancelled) { setData(body); setState('ready'); } })
      .catch((e) => { if (!cancelled) { setError(e.message); setState('error'); } });
    return () => { cancelled = true; };
  }, [queryString]);

  const set = (k) => (v) => { setPage(0); setFilters((f) => ({ ...f, [k]: v })); };
  useEffect(() => { setPage(0); }, [queryString]);
  const activeCount = Object.entries(filters).filter(([k, v]) => v && !(k === 'status' && v === 'open')).length;
  const openTotal = data.facets.roles.reduce((a, r) => a + r.count, 0);
  const countryCount = (name) => data.facets.countries.find((c) => c.value === name)?.count || 0;
  const latestCollected = useMemo(() => {
    const latest = data.jobs.reduce((m, j) => (j.collected_on && j.collected_on > m ? j.collected_on : m), '');
    return latest ? new Date(`${latest}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '';
  }, [data.jobs]);
  const pageCount = Math.max(1, Math.ceil(data.jobs.length / PAGE_SIZE));
  const pageJobs = data.jobs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pageLabel = data.jobs.length
    ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, data.jobs.length)} of ${data.jobs.length}`
    : '0 of 0';

  return (
    <section id="open-positions" style={{ maxWidth: 1400, margin: '36px auto 48px', padding: '0 24px' }}>
      <style>{`
        .jobs-filters { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; }
        .jobs-table-wrap { overflow-x: auto; border: 1px solid #dcdad4; border-bottom: 3px solid #b2b0a9; border-radius: 10px; background: #ffffff; }
        .jobs-table { width: 100%; border-collapse: collapse; min-width: 980px; table-layout: fixed; }
        .jobs-table th { font-family: ${MONO}; font-size: 9.5px; letter-spacing: 0.16em; text-transform: uppercase; color: #9391a0; text-align: left; padding: 14px 14px 10px; border-bottom: 1px solid #dcdad4; white-space: nowrap; background: #faf9f6; }
        .jobs-table td { padding: 11px 12px; border-bottom: 1px solid #e6e3dc; vertical-align: middle; font-size: 13px; color: #2d2d3f; }
        .jobs-pager { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 12px; font-family: ${MONO}; font-size: 11px; color: #5c5a6f; letter-spacing: 0.04em; }
        .jobs-pager button { display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 6px; border: 1px solid #dcdad4; background: #fff; color: #1a1a2e; font-family: ${MONO}; font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; }
        .jobs-pager button:disabled { opacity: 0.4; cursor: default; }
        .jobs-pager button:not(:disabled):hover { border-color: #1a1a2e; }
        .jobs-table tbody tr:last-child td { border-bottom: none; }
        .jobs-table tbody tr { transition: background 0.15s ease; }
        .jobs-table tbody tr:hover { background: #fff; }
        .jobs-apply { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 6px; border: 1.5px solid #e8653a; background: #e8653a; color: #fff; font-family: ${MONO}; font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase; text-decoration: none; white-space: nowrap; transition: transform 0.15s ease, background 0.15s ease; }
        .jobs-apply:hover { transform: translateY(-1px); background: #1a1a2e; border-color: #1a1a2e; }
        .jobs-search { position: relative; flex: 1; min-width: 220px; }
        .jobs-search input { width: 100%; padding: 9px 12px 9px 34px; border-radius: 8px; border: 1px solid #dcdad4; background: #fff; font-family: ${MONO}; font-size: 12px; color: #1a1a2e; outline: none; }
        .jobs-search input:focus { border-color: #1a1a2e; }
        .jobs-toggle { display: inline-flex; align-items: center; gap: 8px; padding: 9px 14px; border-radius: 8px; border: 1px solid #dcdad4; background: #fff; font-family: ${MONO}; font-size: 11px; letter-spacing: 0.06em; color: #1a1a2e; cursor: pointer; }
        .jobs-toggle.on { background: #e8653a; color: #fff; border-color: #e8653a; }
        .jobs-cards { display: none; }
        .jobs-card { background: #fff; border: 1px solid #dcdad4; border-bottom: 3px solid #c9c7c0; border-radius: 10px; padding: 14px; display: grid; gap: 8px; }
        .jobs-card-meta { display: flex; flex-wrap: wrap; gap: 6px 12px; font-family: ${MONO}; font-size: 11px; color: #5c5a6f; }
        @media (max-width: 760px) {
          .jobs-filters label, .jobs-filters select, .jobs-search { width: 100%; }
          .jobs-table-wrap { display: none; }
          .jobs-cards { display: grid; gap: 10px; }
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap', marginBottom: 22 }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.25em', color: '#e8653a', textTransform: 'uppercase', marginBottom: 14 }}>
            Open positions · UAE & Saudi Arabia · live from the database
          </div>
          <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(30px, 3.4vw, 42px)', lineHeight: 1.05, fontWeight: 400, color: '#1a1a2e', margin: '0 0 12px' }}>
            Roles hiring <em style={{ fontStyle: 'normal', color: accent }}>right now</em>
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.65, color: '#5c5a6f', maxWidth: 680, margin: 0 }}>
            Vacancies collected from LinkedIn, Indeed, and Naukri Gulf{latestCollected ? `, last updated ${latestCollected}` : ''}. Duplicate postings across sites are merged. Filter by position, country, or level, then apply directly on the original posting.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: 'open roles', value: openTotal, accent: true },
            { label: 'UAE', value: countryCount('United Arab Emirates') },
            { label: 'Saudi Arabia', value: countryCount('Saudi Arabia') },
          ].map((t) => (
            <div key={t.label} style={{ background: '#fff', border: '1px solid #dcdad4', borderBottom: '3px solid #c9c7c0', borderRadius: 10, padding: '12px 16px', minWidth: 110 }}>
              <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700, lineHeight: 1, color: t.accent ? '#e8653a' : '#1a1a2e' }}>{t.value || '—'}</div>
              <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#9391a0', marginTop: 6 }}>{t.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ---------- FILTERS ---------- */}
      <div style={{
        background: 'rgba(255,255,255,0.72)',
        border: '1px solid #dcdad4',
        borderRadius: 18,
        padding: 16,
        marginBottom: 16,
        boxShadow: '0 10px 22px -18px rgba(0,0,0,0.25)',
      }}>
        <div className="jobs-filters">
          <FacetSelect label="Position" value={filters.role} onChange={set('role')} options={data.facets.roles} allLabel="All positions" />
          <FacetSelect label="Track" value={filters.category} onChange={set('category')} options={data.facets.categories} allLabel="All tracks" />
          <FacetSelect label="Country" value={filters.country} onChange={set('country')} options={data.facets.countries} allLabel="UAE & Saudi" />
          <FacetSelect label="Level" value={filters.experience} onChange={set('experience')} options={data.facets.experiences} allLabel="Any level" />
          <label className="jobs-search" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#9391a0', paddingLeft: 4 }}>Search</span>
            <span style={{ position: 'relative', display: 'block' }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9391a0' }} />
              <input value={qDraft} onChange={(e) => setQDraft(e.target.value)} placeholder="Title, company, skill, city…" />
            </span>
          </label>
          <button
            type="button"
            className={`jobs-toggle ${filters.status === 'open' ? 'on' : ''}`}
            onClick={() => set('status')(filters.status === 'open' ? 'all' : 'open')}
            title="Show only positions that are currently open"
          >
            <span style={{ width: 8, height: 8, borderRadius: 8, background: filters.status === 'open' ? '#4ade80' : '#c9c7c0' }} />
            {filters.status === 'open' ? 'OPEN ONLY' : 'ALL STATUSES'}
          </button>
          {(activeCount > 0 || qDraft) && (
            <button
              type="button"
              className="jobs-toggle"
              onClick={() => { setFilters(EMPTY_FILTERS); setQDraft(''); }}
            >
              <RefreshCw size={12} /> RESET
            </button>
          )}
        </div>
      </div>

      {/* ---------- RESULTS ---------- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, fontFamily: MONO, fontSize: 11, color: '#5c5a6f', letterSpacing: '0.04em' }}>
        <span>
          {state === 'loading' && 'Loading positions…'}
          {state === 'ready' && `${data.total} ${data.total === 1 ? 'position' : 'positions'}${activeCount ? ' match your filters' : ''}`}
          {state === 'error' && 'Could not load positions'}
        </span>
        <span>sorted by newest</span>
      </div>

      {state === 'error' ? (
        <div style={{ border: '1.5px dashed #c9c7c0', borderRadius: 18, padding: 28, background: '#fff', textAlign: 'center' }}>
          <div style={{ fontFamily: SERIF, fontSize: 24, marginBottom: 8 }}>The job board is offline</div>
          <div style={{ fontSize: 13, color: '#5c5a6f', fontFamily: MONO }}>{error}</div>
        </div>
      ) : (
        <div className="jobs-table-wrap scrollbar-styled">
          <table className="jobs-table">
            <thead>
              <tr>
                <th style={{ width: 130 }}>Position</th>
                <th>Title</th>
                <th style={{ width: '18%' }}>Company</th>
                <th style={{ width: 150 }}>Location</th>
                <th style={{ width: 84 }}>Posted</th>
                <th style={{ width: 104 }}>Level</th>
                <th style={{ width: 112 }}>Salary</th>
                <th style={{ width: 118, textAlign: 'right' }}>Apply</th>
              </tr>
            </thead>
            <tbody>
              {state === 'loading' && data.jobs.length === 0 && (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j}><span style={{ display: 'block', height: 12, borderRadius: 6, background: '#e6e3dc', width: j === 1 ? '60%' : '80%' }} /></td>
                    ))}
                  </tr>
                ))
              )}
              {state === 'ready' && data.jobs.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 36, color: '#9391a0', fontFamily: MONO, fontSize: 12 }}>No positions match those filters.</td></tr>
              )}
              {pageJobs.map((job) => {
                const color = roleColor(job.role_type);
                return (
                  <tr key={job.id} style={{ opacity: state === 'loading' ? 0.55 : 1 }}>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase',
                        color, background: `${color}14`, padding: '4px 8px', borderRadius: 8, whiteSpace: 'nowrap',
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: 1.5, background: color, transform: 'rotate(45deg)' }} />
                        {job.role_type}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1a1a2e', lineHeight: 1.35, fontFamily: "'Space Grotesk', sans-serif", fontSize: 14 }}>{job.title}</div>
                      {job.skills && <div style={{ fontFamily: MONO, fontSize: 10.5, color: '#9391a0', marginTop: 3 }}>{job.skills}</div>}
                    </td>
                    <td>
                      <div style={{ lineHeight: 1.35 }}>{job.company}</div>
                      <div style={{ fontFamily: MONO, fontSize: 10, color: '#9391a0', marginTop: 2 }}>{job.source}</div>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><MapPin size={12} style={{ color: '#9391a0', flexShrink: 0 }} />{job.location || job.country}</span>
                      <div style={{ fontFamily: MONO, fontSize: 10, color: '#9391a0', marginTop: 2, paddingLeft: 18 }}>{job.country === 'Saudi Arabia' ? 'KSA' : 'UAE'}</div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontFamily: MONO, fontSize: 11.5 }}>{formatDate(job.posted_on)}</td>
                    <td style={{ fontFamily: MONO, fontSize: 11 }}>
                      {job.experience || '—'}
                      {job.employment_type && <div style={{ fontSize: 10, color: '#9391a0', marginTop: 2 }}>{job.employment_type}</div>}
                    </td>
                    <td style={{ fontFamily: MONO, fontSize: 11 }}>{job.salary || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      {job.apply_url ? (
                        <a className="jobs-apply" href={job.apply_url} target="_blank" rel="noopener noreferrer" style={{ '--apply-accent': color }}>
                          Apply <ExternalLink size={11} />
                        </a>
                      ) : (
                        <span style={{ fontFamily: MONO, fontSize: 10.5, color: '#9391a0' }}>no link</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {state !== 'error' && (
        <div className="jobs-cards">
          {state === 'ready' && pageJobs.length === 0 && (
            <div style={{ textAlign: 'center', padding: 28, color: '#9391a0', fontFamily: MONO, fontSize: 12, background: '#fff', border: '1px dashed #c9c7c0', borderRadius: 10 }}>No positions match those filters.</div>
          )}
          {pageJobs.map((job) => {
            const color = roleColor(job.role_type);
            return (
              <article key={`card-${job.id}`} className="jobs-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color, background: `${color}14`, padding: '4px 8px', borderRadius: 999 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 1.5, background: color, transform: 'rotate(45deg)' }} />
                    {job.role_type}
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 10.5, color: '#9391a0' }}>{formatDate(job.posted_on)}</span>
                </div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15, color: '#1a1a2e', lineHeight: 1.3 }}>{job.title}</div>
                <div style={{ fontSize: 13, color: '#2d2d3f' }}>{job.company}</div>
                <div className="jobs-card-meta">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><MapPin size={11} />{job.location || job.country} · {job.country === 'Saudi Arabia' ? 'KSA' : 'UAE'}</span>
                  {job.experience && <span>{job.experience}</span>}
                  {job.employment_type && <span>{job.employment_type}</span>}
                  {job.salary && <span>{job.salary}</span>}
                </div>
                {job.apply_url && (
                  <a className="jobs-apply" href={job.apply_url} target="_blank" rel="noopener noreferrer" style={{ justifySelf: 'start', marginTop: 2 }}>
                    Apply <ExternalLink size={11} />
                  </a>
                )}
              </article>
            );
          })}
        </div>
      )}

      {state !== 'error' && data.jobs.length > PAGE_SIZE && (
        <div className="jobs-pager">
          <span>Showing {pageLabel}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}><ChevronLeft size={12} /> Prev</button>
            <span>Page {page + 1} / {pageCount}</span>
            <button type="button" onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1}>Next <ChevronRight size={12} /></button>
          </div>
        </div>
      )}
    </section>
  );
}
