/* GitOps Topic Data */
export const GITOPS_COMPONENTS = {
  'argocd': { group: 'operator', name: 'ArgoCD', short: 'Git-driven Kubernetes deployment', color: '#dc2626' },
  'flux': { group: 'operator', name: 'Flux', short: 'GitOps CD for Kubernetes', color: '#0284c7' },
  'git-repo': { group: 'source', name: 'Git Repository', short: 'Source of truth for apps', color: '#0891b2' },
  'reconciliation': { group: 'core', name: 'Reconciliation', short: 'Continuous convergence', color: '#16a34a' },
  'promotion': { group: 'workflow', name: 'Promotion Pipeline', short: 'Dev → Staging → Prod', color: '#7c3aed' },
  'secrets': { group: 'security', name: 'Secret Management', short: 'Sealed secrets, external-secrets', color: '#dc2626' },
  'rollback': { group: 'safety', name: 'Rollback & Disaster Recovery', short: 'Automatic sync to known-good state', color: '#ea580c' },
};

export const GITOPS_GROUPS = [
  { id: 'operator', title: 'Operators', color: '#dc2626', components: ['argocd', 'flux'] },
  { id: 'source', title: 'Source of Truth', color: '#0891b2', components: ['git-repo'] },
  { id: 'core', title: 'Core Concepts', color: '#16a34a', components: ['reconciliation'] },
  { id: 'workflow', title: 'Workflow', color: '#7c3aed', components: ['promotion'] },
  { id: 'security', title: 'Security', color: '#dc2626', components: ['secrets'] },
  { id: 'safety', title: 'Safety & Recovery', color: '#ea580c', components: ['rollback'] },
];

export const GITOPS_SECONDARY_SECTIONS = [
  { id: 'operator', title: 'Operators', color: '#dc2626', components: ['argocd', 'flux'] },
  { id: 'source', title: 'Source of Truth', color: '#0891b2', components: ['git-repo'] },
  { id: 'core', title: 'Core Concepts', color: '#16a34a', components: ['reconciliation'] },
  { id: 'workflow', title: 'Workflow', color: '#7c3aed', components: ['promotion'] },
  { id: 'security', title: 'Security', color: '#dc2626', components: ['secrets'] },
  { id: 'safety', title: 'Safety & Recovery', color: '#ea580c', components: ['rollback'] },
];

export const GITOPS_FLOWS = [
  ['git-repo', 'argocd'],
  ['git-repo', 'flux'],
  ['argocd', 'reconciliation'],
  ['reconciliation', 'promotion'],
  ['promotion', 'rollback'],
];

export const GITOPS_JOURNEY = [
  { title: 'Developer commits', desc: 'Code changes pushed to Git main branch.', actor: 'dev' },
  { title: 'Update deployment manifest', desc: 'Deployment YAML file updated with new image tag.', actor: 'manifest' },
  { title: 'GitOps operator watches', desc: 'ArgoCD/Flux detects new commit in Git.', actor: 'operator' },
  { title: 'Reconciliation runs', desc: 'Operator fetches manifests, compares to cluster state.', actor: 'reconcile' },
  { title: 'Resources updated', desc: 'Operator applies YAML changes to cluster.', actor: 'apply' },
  { title: 'Application rolls out', desc: 'Pods are created/updated with new image.', actor: 'rollout' },
  { title: 'Monitor & sync', desc: 'Continuous monitoring; auto-rollback if drift detected.', actor: 'monitor' },
];

export const GITOPS_TOPIC = {
  id: 'gitops',
  name: 'GitOps',
  short: 'Git as source of truth; ArgoCD, Flux, and reconciliation.',
  accent: '#dc2626',
  accentSoft: '#fecaca',
  heroTitle: 'Git as the source of truth: GitOps fundamentals.',
  heroLead: 'Understand GitOps principles: Git is the system of record. ArgoCD and Flux keep clusters in sync. Deployments are PRs.',
  heroStats: ['7 concepts', 'pull-based delivery', 'automatic reconciliation'],
  components: GITOPS_COMPONENTS,
  groups: GITOPS_GROUPS,
  secondarySections: GITOPS_SECONDARY_SECTIONS,
  flows: GITOPS_FLOWS,
  journey: GITOPS_JOURNEY,
};

export default GITOPS_TOPIC;
