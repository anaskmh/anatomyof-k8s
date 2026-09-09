import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ExternalLink, ChevronDown } from 'lucide-react';
import JobsBoard from './JobsBoard';

const MONO = "'JetBrains Mono', monospace";
const SERIF = "'Space Grotesk', sans-serif";

// ============================================================
// CAREER PATHS — roles in the DevOps / platform space
// ============================================================
const ROLES = [
  {
    id: 'devops',
    title: 'DevOps Engineer',
    color: '#2563eb',
    tag: 'GENERALIST',
    short: 'Owns the path from commit to production.',
    intro: 'Builds and maintains the pipelines, environments, and automation that let teams ship safely and often. The broadest role in the space and the most common entry point.',
    dayToDay: [
      'Design and maintain CI/CD pipelines and release workflows',
      'Containerize services and manage their runtime configuration',
      'Automate infrastructure with Terraform or similar tooling',
      'Debug failed deploys, flaky builds, and environment drift',
    ],
    skills: ['Linux & shell', 'Git workflows', 'Docker', 'CI/CD (GitHub Actions, GitLab CI)', 'Terraform', 'One cloud provider', 'Kubernetes basics', 'Scripting (Bash, Python)'],
    topics: ['linux', 'docker', 'cicd', 'terraform', 'kubernetes'],
    certs: ['AWS Solutions Architect Associate', 'HashiCorp Terraform Associate', 'CKA'],
  },
  {
    id: 'sre',
    title: 'Site Reliability Engineer',
    color: '#dc2626',
    tag: 'RELIABILITY',
    short: 'Keeps production up and measurable.',
    intro: 'Treats operations as a software problem. Defines SLOs, builds observability, runs incident response, and removes toil with code. Closer to production and to on-call than any other role.',
    dayToDay: [
      'Define SLIs and SLOs, manage error budgets',
      'Build dashboards, alerts, and runbooks that engineers actually use',
      'Lead incident response and blameless postmortems',
      'Capacity planning, load testing, and performance tuning',
    ],
    skills: ['Metrics, logs, traces (Prometheus, Grafana, OpenTelemetry)', 'Kubernetes internals', 'Linux performance', 'Networking & DNS', 'Incident management', 'Programming (Go, Python)', 'Chaos & resilience testing'],
    topics: ['monitoring', 'kubernetes', 'linux', 'cloud'],
    certs: ['CKA', 'Prometheus Certified Associate', 'AWS SysOps Administrator'],
  },
  {
    id: 'platform',
    title: 'Platform Engineer',
    color: '#7c3aed',
    tag: 'INTERNAL PRODUCT',
    short: 'Builds the paved road other engineers deploy on.',
    intro: 'Runs the internal developer platform: shared clusters, golden paths, self-service infrastructure, and GitOps delivery. Product thinking applied to infrastructure.',
    dayToDay: [
      'Operate multi-tenant Kubernetes clusters and cluster add-ons',
      'Build self-service templates, Helm charts, and Terraform modules',
      'Run GitOps delivery with Argo CD or Flux',
      'Own developer experience: onboarding, docs, and platform APIs',
    ],
    skills: ['Deep Kubernetes (operators, CRDs, admission)', 'GitOps (Argo CD, Flux)', 'Helm / Kustomize', 'Terraform modules', 'Identity & RBAC', 'Developer portals (Backstage)', 'Go for controllers'],
    topics: ['kubernetes', 'gitops', 'terraform', 'cicd'],
    certs: ['CKA', 'CKAD', 'CKS', 'Certified Argo Project Associate'],
  },
  {
    id: 'cloud',
    title: 'Cloud Engineer / Architect',
    color: '#ea580c',
    tag: 'INFRASTRUCTURE',
    short: 'Designs the landing zone everything runs in.',
    intro: 'Owns accounts, networks, identity, and cost across one or more cloud providers. Turns business requirements into secure, well-architected infrastructure.',
    dayToDay: [
      'Design VPCs, subnets, peering, and hybrid connectivity',
      'Manage IAM policies, organizations, and guardrails',
      'Right-size compute and storage; own the cloud bill',
      'Plan migrations and multi-region architectures',
    ],
    skills: ['Deep knowledge of one cloud, working knowledge of another', 'Networking (VPC, DNS, load balancers)', 'IAM & security', 'Terraform at scale', 'Cost optimization', 'Well-Architected frameworks'],
    topics: ['cloud', 'terraform', 'linux', 'monitoring'],
    certs: ['AWS Solutions Architect Professional', 'Google Professional Cloud Architect', 'Azure Solutions Architect Expert'],
  },
  {
    id: 'k8s-admin',
    title: 'Kubernetes Administrator',
    color: '#326ce5',
    tag: 'SPECIALIST',
    short: 'Runs clusters as a first-class system.',
    intro: 'Focused on the cluster itself: upgrades, networking, storage, security hardening, and troubleshooting. A specialist track that often grows into platform or SRE work.',
    dayToDay: [
      'Provision and upgrade clusters (managed or self-hosted)',
      'Configure CNI, ingress, storage classes, and CSI drivers',
      'Harden RBAC, network policies, and pod security',
      'Troubleshoot scheduling, networking, and node failures',
    ],
    skills: ['Kubernetes architecture end to end', 'etcd operations & backup', 'CNI & CoreDNS', 'Persistent storage', 'RBAC & admission control', 'Cluster autoscaling', 'Linux & container runtimes'],
    topics: ['kubernetes', 'linux', 'docker', 'monitoring'],
    certs: ['CKA', 'CKS', 'KCNA'],
  },
  {
    id: 'devsecops',
    title: 'DevSecOps Engineer',
    color: '#059669',
    tag: 'SECURITY',
    short: 'Shifts security left into the pipeline.',
    intro: 'Embeds security into build, deploy, and runtime. Scans images and IaC, manages secrets, enforces policy as code, and hardens the supply chain without slowing teams down.',
    dayToDay: [
      'Add SAST, SCA, and image scanning to pipelines',
      'Manage secrets with Vault or cloud KMS',
      'Enforce policy with OPA / Gatekeeper / Kyverno',
      'Sign and verify artifacts; harden the software supply chain',
    ],
    skills: ['CI/CD security gates', 'Container & Kubernetes security', 'Secrets management', 'Policy as code', 'IAM & least privilege', 'Supply chain (SBOM, Sigstore)', 'Threat modeling'],
    topics: ['cicd', 'kubernetes', 'docker', 'cloud'],
    certs: ['CKS', 'AWS Security Specialty', 'HashiCorp Vault Associate'],
  },
];

// ============================================================
// LEARNING ROADMAP — how CloudTruck topics stack into a career
// ============================================================
const ROADMAP = [
  { step: '01', title: 'Foundations', topic: 'linux', color: '#7c3aed', blurb: 'Linux processes, filesystems, networking, permissions, and the primitives containers are built on.', outcome: 'Comfortable in a shell on any server.' },
  { step: '02', title: 'Containers', topic: 'docker', color: '#0ea5e9', blurb: 'Images, layers, registries, runtimes, volumes, and networks. Build and debug real containers.', outcome: 'Can package and run any service.' },
  { step: '03', title: 'Orchestration', topic: 'kubernetes', color: '#326ce5', blurb: 'Control plane, workloads, networking, storage, security, autoscaling. The core of modern infrastructure.', outcome: 'Can deploy and operate on a cluster.' },
  { step: '04', title: 'Delivery', topic: 'cicd', color: '#2563eb', blurb: 'Pipelines, runners, artifacts, environments, approvals. Turn commits into releases.', outcome: 'Ships with automation, not by hand.' },
  { step: '05', title: 'Infrastructure as Code', topic: 'terraform', color: '#0d9488', blurb: 'Providers, state, modules, plan and apply. Make infrastructure reviewable and repeatable.', outcome: 'Infrastructure lives in Git.' },
  { step: '06', title: 'Cloud', topic: 'cloud', color: '#ea580c', blurb: 'VPCs, IAM, compute, storage, load balancers, DNS across AWS, GCP, and Azure.', outcome: 'Designs a secure landing zone.' },
  { step: '07', title: 'Observability', topic: 'monitoring', color: '#dc2626', blurb: 'Metrics, logs, traces, SLOs, alerts. Know what production is doing before users do.', outcome: 'Runs on-call with confidence.' },
  { step: '08', title: 'GitOps', topic: 'gitops', color: '#059669', blurb: 'Argo CD, Flux, reconciliation, promotion, rollback. Git as the source of truth for everything.', outcome: 'Operates a platform at scale.' },
];

// ============================================================
// INTERVIEW DRILLS — questions that map to the explainers
// ============================================================
const DRILLS = [
  { q: 'Walk me through what happens when you run kubectl apply.', topic: 'kubernetes', hint: 'API server → auth/RBAC/admission → etcd → controllers → scheduler → kubelet → runtime.' },
  { q: 'A pod is stuck in CrashLoopBackOff. How do you debug it?', topic: 'kubernetes', hint: 'describe, logs --previous, events, probes, resource limits, image and config.' },
  { q: 'Why is my Docker image 1.2 GB and how would you shrink it?', topic: 'docker', hint: 'Base image, multi-stage builds, layer ordering, .dockerignore, cache mounts.' },
  { q: 'Terraform plan shows changes nobody made. What happened?', topic: 'terraform', hint: 'Drift. Compare state to reality, import or refresh, lock down out-of-band changes.' },
  { q: 'Define an SLO for a checkout API and the alert that protects it.', topic: 'monitoring', hint: 'SLI (success rate / latency), target, window, burn-rate alerts over error budget.' },
  { q: 'How does GitOps differ from a pipeline that runs kubectl apply?', topic: 'gitops', hint: 'Pull vs push, continuous reconciliation, drift correction, Git as audit log.' },
  { q: 'A service in one VPC cannot reach a database in another. Where do you look?', topic: 'cloud', hint: 'Peering / transit routes, security groups, NACLs, DNS resolution, subnets.' },
  { q: 'Explain the difference between a process, a container, and a VM.', topic: 'linux', hint: 'Namespaces and cgroups vs hypervisor; shared kernel vs isolated kernel.' },
];

const TOPIC_NAMES = {
  kubernetes: 'Kubernetes',
  docker: 'Docker',
  cicd: 'CI/CD',
  terraform: 'Terraform',
  monitoring: 'Monitoring',
  linux: 'Linux',
  cloud: 'Cloud',
  gitops: 'GitOps',
};

const eyebrow = (color) => ({
  fontFamily: MONO,
  fontSize: 11,
  letterSpacing: '0.25em',
  color: color || '#e8653a',
  textTransform: 'uppercase',
  marginBottom: 14,
});

const h2 = {
  fontFamily: SERIF,
  fontSize: 'clamp(30px, 3.4vw, 42px)',
  lineHeight: 1.05,
  fontWeight: 400,
  color: '#1a1a2e',
  margin: '0 0 12px',
};

const lead = {
  fontSize: 16,
  lineHeight: 1.65,
  color: '#5c5a6f',
  maxWidth: 680,
  margin: 0,
};

function TopicChip({ id, onOpenTopic, color }) {
  return (
    <button
      onClick={() => onOpenTopic(id)}
      title={`Open the ${TOPIC_NAMES[id]} explainer`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '4px 9px',
        borderRadius: 8,
        border: '1px solid #dcdad4',
        background: '#fff',
        color: '#2d2d3f',
        fontFamily: MONO,
        fontSize: 10,
        letterSpacing: '0.08em',
        cursor: 'pointer',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 1.5, background: color, transform: 'rotate(45deg)' }} />
      {TOPIC_NAMES[id]}
    </button>
  );
}

export default function CareersPage({ accent = '#326ce5', onOpenTopic = () => {} }) {
  const [openRole, setOpenRole] = useState('devops');
  const [openDrill, setOpenDrill] = useState(null);

  return (
    <div className="careers-page">
      <style>{`
        .careers-hero { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(300px, 0.7fr); gap: 28px; align-items: center; }
        .careers-roles { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; align-items: start; }
        .careers-roadmap { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
        .careers-drills { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .careers-role-card { transition: transform 0.25s ease, box-shadow 0.25s ease; }
        .careers-role-card:hover { transform: translateY(-3px); box-shadow: 0 18px 32px -22px rgba(0,0,0,0.35); }
        .careers-roadmap-card { position: relative; }
        .careers-roadmap-card::after {
          content: ''; position: absolute; top: 34px; right: -14px; width: 14px; height: 1.5px; background: #c9c7c0;
        }
        .careers-roadmap-card:nth-child(4n)::after, .careers-roadmap-card:last-child::after { display: none; }
        @media (max-width: 1120px) {
          .careers-hero { grid-template-columns: 1fr; }
          .careers-roles { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .careers-roadmap { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .careers-roadmap-card::after { display: none; }
        }
        @media (max-width: 760px) {
          .careers-roles, .careers-roadmap, .careers-drills { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* ---------- HERO ---------- */}
      <section style={{ padding: '36px 24px 8px', maxWidth: 1400, margin: '0 auto' }}>
        <div className="careers-hero">
          <div style={{ padding: '24px 8px' }}>
            <div style={eyebrow()}>Careers · DevOps, SRE, Platform · where the explainers lead</div>
            <h1 style={{
              fontFamily: SERIF,
              fontSize: 'clamp(38px, 4.6vw, 62px)',
              lineHeight: 1.02,
              fontWeight: 400,
              color: '#1a1a2e',
              margin: '0 0 18px',
              letterSpacing: '-0.01em',
            }}>
              Turn the mental models into a <em style={{ fontStyle: 'normal', color: accent }}>career</em>.
            </h1>
            <p style={{ ...lead, fontSize: 17, maxWidth: 620 }}>
              Browse live openings across the UAE and Saudi Arabia, then work backwards: every CloudTruck topic maps to real roles and real interview questions.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 22 }}>
              {['live job board · UAE & KSA', '6 career paths', '8-stage roadmap', 'interview drills'].map((s) => (
                <span key={s} style={{
                  fontFamily: MONO, fontSize: 11, letterSpacing: '0.06em',
                  padding: '6px 12px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.7)', border: '1px solid #dcdad4', color: '#2d2d3f',
                }}>{s}</span>
              ))}
            </div>
          </div>

          <div style={{
            background: '#ffffff',
            border: '1px solid #dcdad4', borderBottom: '3px solid #b2b0a9',
            borderRadius: 18,
            padding: 22,
            boxShadow: '0 24px 44px -32px rgba(0,0,0,0.4)',
          }}>
            <div style={{ ...eyebrow(accent), marginBottom: 10 }}>How to use this page</div>
            <ol style={{ margin: 0, padding: '0 0 0 18px', color: '#2d2d3f', fontSize: 14, lineHeight: 1.7 }}>
              <li>Filter the open positions by role and country to see what the market wants.</li>
              <li>Pick the career path that matches where you want to be in 12 months.</li>
              <li>Work the roadmap in order and drill the interview questions.</li>
              <li>Apply straight from the board when the flows feel obvious.</li>
            </ol>
          </div>
        </div>
      </section>

      {/* ---------- OPEN POSITIONS (from Neon via /api/jobs) ---------- */}
      <JobsBoard accent={accent} />

      {/* ---------- ROLES ---------- */}
      <section style={{ maxWidth: 1400, margin: '40px auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap', marginBottom: 22 }}>
          <div>
            <div style={eyebrow()}>Career paths</div>
            <h2 style={h2}>Six roles, one shared foundation</h2>
            <p style={lead}>The titles differ, but the underlying systems are the same. Click a role to see its day to day, the skills that matter, and the topics to study.</p>
          </div>
        </div>

        <div className="careers-roles">
          {ROLES.map((role) => {
            const open = openRole === role.id;
            return (
              <motion.div
                key={role.id}
                layout
                className="careers-role-card"
                onClick={() => setOpenRole(open ? null : role.id)}
                style={{
                  background: open ? '#fff' : '#ffffff',
                  border: open ? `1.5px solid ${role.color}` : '1px solid #dcdad4',
                  borderRadius: 16,
                  padding: 18,
                  cursor: 'pointer',
                  gridColumn: open ? 'span 1' : undefined,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                  <span style={{
                    fontFamily: MONO, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase',
                    color: role.color, background: `${role.color}14`, padding: '4px 8px', borderRadius: 8,
                  }}>{role.tag}</span>
                  <ChevronDown size={14} style={{ color: '#9391a0', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }} />
                </div>
                <div style={{ fontFamily: SERIF, fontSize: 26, lineHeight: 1.05, color: '#1a1a2e', marginBottom: 6 }}>{role.title}</div>
                <div style={{ fontFamily: MONO, fontSize: 12, color: '#5c5a6f', lineHeight: 1.5 }}>{role.short}</div>

                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      style={{ overflow: 'hidden' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <p style={{ fontSize: 14, lineHeight: 1.65, color: '#2d2d3f', margin: '16px 0 14px' }}>{role.intro}</p>

                      <div style={{ ...eyebrow(), fontSize: 9.5, marginBottom: 8 }}>Day to day</div>
                      <ul style={{ margin: '0 0 14px', padding: '0 0 0 16px', fontSize: 13, lineHeight: 1.6, color: '#2d2d3f' }}>
                        {role.dayToDay.map((d) => <li key={d}>{d}</li>)}
                      </ul>

                      <div style={{ ...eyebrow(), fontSize: 9.5, marginBottom: 8 }}>Core skills</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                        {role.skills.map((sk) => (
                          <span key={sk} style={{
                            fontSize: 11.5, padding: '4px 9px', borderRadius: 8,
                            background: '#f0ece6', color: '#2d2d3f', border: '1px solid #e6e3dc',
                          }}>{sk}</span>
                        ))}
                      </div>

                      <div style={{ ...eyebrow(), fontSize: 9.5, marginBottom: 8 }}>Study these topics</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                        {role.topics.map((t) => (
                          <TopicChip key={t} id={t} color={role.color} onOpenTopic={onOpenTopic} />
                        ))}
                      </div>

                      <div style={{ ...eyebrow(), fontSize: 9.5, marginBottom: 8 }}>Certifications that signal it</div>
                      <div style={{ fontFamily: MONO, fontSize: 11.5, lineHeight: 1.7, color: '#5c5a6f' }}>
                        {role.certs.join(' · ')}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ---------- ROADMAP ---------- */}
      <section style={{ maxWidth: 1400, margin: '56px auto 32px', padding: '0 24px' }}>
        <div style={eyebrow()}>Learning roadmap</div>
        <h2 style={h2}>Eight stages, in the order they compound</h2>
        <p style={{ ...lead, marginBottom: 26 }}>Each stage is a CloudTruck explainer. Finish one before moving on, and revisit earlier ones when a later stage stops making sense.</p>

        <div className="careers-roadmap">
          {ROADMAP.map((r) => (
            <button
              key={r.step}
              className="careers-roadmap-card"
              onClick={() => onOpenTopic(r.topic)}
              style={{
                textAlign: 'left',
                background: '#ffffff',
                border: '1px solid #dcdad4',
                borderRadius: 16,
                padding: 18,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: MONO, fontSize: 22, color: r.color, fontWeight: 600 }}>{r.step}</span>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: r.color, transform: 'rotate(45deg)' }} />
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1a2e' }}>{r.title}</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.55, color: '#5c5a6f', flex: 1 }}>{r.blurb}</div>
              <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.04em', color: '#2d2d3f', borderTop: '1px dashed #c9c7c0', paddingTop: 8 }}>
                → {r.outcome}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: r.color }}>
                Open explainer <ArrowRight size={11} />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ---------- INTERVIEW DRILLS ---------- */}
      <section style={{ maxWidth: 1400, margin: '56px auto 32px', padding: '0 24px' }}>
        <div style={eyebrow()}>Interview drills</div>
        <h2 style={h2}>Questions that test the mental model</h2>
        <p style={{ ...lead, marginBottom: 26 }}>Good interviewers do not ask for definitions. They ask you to trace a flow or debug a failure. Reveal the hint, then go open the explainer and prove it to yourself.</p>

        <div className="careers-drills">
          {DRILLS.map((d, i) => {
            const open = openDrill === i;
            return (
              <div
                key={d.q}
                style={{
                  background: open ? '#fff' : '#ffffff',
                  border: '1px solid #dcdad4',
                  borderRadius: 14,
                  padding: '14px 16px',
                }}
              >
                <button
                  onClick={() => setOpenDrill(open ? null : i)}
                  style={{
                    width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
                  }}
                >
                  <span style={{ fontSize: 14.5, fontWeight: 600, color: '#1a1a2e', lineHeight: 1.45 }}>{d.q}</span>
                  <ChevronDown size={15} style={{ color: '#9391a0', flexShrink: 0, marginTop: 3, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }} />
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ fontFamily: MONO, fontSize: 12, lineHeight: 1.6, color: '#2d2d3f', margin: '12px 0 10px', padding: '10px 12px', background: '#f0ece6', borderRadius: 10 }}>
                        {d.hint}
                      </div>
                      <TopicChip id={d.topic} color={accent} onOpenTopic={onOpenTopic} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------- RESOURCES ---------- */}
      <section style={{ maxWidth: 1020, margin: '56px auto 64px', padding: '0 24px' }}>
        <div style={{
          background: '#ffffff',
          border: '1px solid #dcdad4', borderBottom: '3px solid #b2b0a9',
          borderRadius: 18,
          padding: '28px 30px',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          gap: 24,
          alignItems: 'center',
        }}>
          <div>
            <div style={eyebrow(accent)}>Keep going</div>
            <div style={{ fontFamily: SERIF, fontSize: 30, lineHeight: 1.1, color: '#1a1a2e', marginBottom: 10 }}>
              Official certification tracks
            </div>
            <p style={{ ...lead, fontSize: 14.5 }}>
              Certifications are not the goal, but they force structured study. These are the ones hiring teams recognize most for the roles above.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'CNCF · CKA / CKAD / CKS', href: 'https://www.cncf.io/training/certification/' },
              { label: 'HashiCorp · Terraform Associate', href: 'https://developer.hashicorp.com/certifications/infrastructure-automation' },
              { label: 'AWS Certification', href: 'https://aws.amazon.com/certification/' },
              { label: 'Google Cloud Certification', href: 'https://cloud.google.com/learn/certification' },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                  padding: '9px 14px', borderRadius: 10, border: '1px solid #c9c7c0', background: '#fff',
                  fontFamily: MONO, fontSize: 11.5, letterSpacing: '0.04em', color: '#1a1a2e', textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {l.label} <ExternalLink size={12} style={{ color: '#9391a0' }} />
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
