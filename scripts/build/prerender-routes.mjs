// Post-build step: write a route-specific index.html for each SPA route so
// link scrapers (WhatsApp, LinkedIn, Slack, X) that never run JavaScript see
// the right title, description, and preview image. The app itself is
// unchanged; each file just carries different <head> metadata.
//
// Usage: node scripts/build/prerender-routes.mjs   (runs after `vite build`)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SITE = 'https://www.cloudtruck.space';
const DIST = 'dist';

const DEFAULT = {
  title: 'CloudTruck — Interactive DevOps explainers and careers',
  description: 'Interactive visual explainers for Kubernetes, Docker, CI/CD, Terraform, observability, Linux, cloud, and GitOps, plus a live DevOps job board for the UAE and Saudi Arabia.',
  image: '/og/default.png',
};

const TOPIC = (name, blurb) => ({
  title: `${name} explained visually — CloudTruck`,
  description: `${blurb} Click any component to see what it is, what it does, and a real-world example.`,
  image: '/og/default.png',
});

export const ROUTES = {
  '/': DEFAULT,
  '/careers': {
    title: 'Recent Cloud, DevOps, Software & AI jobs in UAE and Saudi Arabia — CloudTruck Careers',
    description: 'Live openings across Dubai, Abu Dhabi, Riyadh, and Jeddah: DevOps, SRE, platform, cloud, software, QA, and AI roles collected from LinkedIn and Indeed. Filter by position, country, and level, then apply directly. Plus career paths, a learning roadmap, and interview drills.',
    image: '/og/careers.png',
  },
  '/topics/kubernetes': TOPIC('Kubernetes', 'Trace how requests move across the control plane, worker nodes, networking, storage, and security layers.'),
  '/topics/docker': TOPIC('Docker', 'Follow the full container lifecycle: build, cache, package, push, run, inspect, and troubleshoot.'),
  '/topics/cicd': TOPIC('CI/CD Pipelines', 'Follow a git push through runners, jobs, artifacts, approvals, and production deploys.'),
  '/topics/terraform': TOPIC('Terraform', 'Understand providers, state, modules, plan and apply, and drift detection.'),
  '/topics/monitoring': TOPIC('Monitoring & Observability', 'Metrics, logs, traces, SLOs, dashboards, and alerts, and how they fit together.'),
  '/topics/linux': TOPIC('Linux Internals', 'Processes, systemd, filesystems, networking, permissions, and the primitives behind containers.'),
  '/topics/cloud': TOPIC('Cloud Foundations', 'VPCs, IAM, compute, storage, load balancers, and DNS across AWS, GCP, and Azure.'),
  '/topics/gitops': TOPIC('GitOps', 'Git as the source of truth: Argo CD, Flux, reconciliation, promotion, and rollback.'),
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function headFor(path, meta) {
  const url = `${SITE}${path === '/' ? '' : path}`;
  const image = `${SITE}${meta.image}`;
  return `
    <title>${esc(meta.title)}</title>
    <meta name="description" content="${esc(meta.description)}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="CloudTruck" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${esc(meta.title)}" />
    <meta property="og:description" content="${esc(meta.description)}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${esc(meta.title)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(meta.title)}" />
    <meta name="twitter:description" content="${esc(meta.description)}" />
    <meta name="twitter:image" content="${image}" />
`;
}

const template = readFileSync(join(DIST, 'index.html'), 'utf8');
const START = '<!-- route-meta:start -->';
const END = '<!-- route-meta:end -->';
if (!template.includes(START) || !template.includes(END)) {
  throw new Error(`index.html must contain ${START} and ${END} markers around the route metadata`);
}
const before = template.slice(0, template.indexOf(START) + START.length);
const after = template.slice(template.indexOf(END));

let count = 0;
for (const [path, meta] of Object.entries(ROUTES)) {
  const html = before + headFor(path, meta) + '    ' + after;
  const dir = path === '/' ? DIST : join(DIST, path);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
  count += 1;
}
console.log(`prerendered route metadata for ${count} routes`);
