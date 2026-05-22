/* Cloud Foundations Topic Data */
export const CLOUD_COMPONENTS = {
  vpc: { group: 'network', name: 'VPC & Subnets', short: 'Virtual network isolation', color: '#0891b2' },
  iam: { group: 'security', name: 'IAM', short: 'Identity and access management', color: '#dc2626' },
  compute: { group: 'compute', name: 'Compute Instances', short: 'EC2, GCE, VMs', color: '#7c3aed' },
  storage: { group: 'storage', name: 'Storage Services', short: 'S3, GCS, object & file storage', color: '#16a34a' },
  db: { group: 'storage', name: 'Managed Databases', short: 'RDS, Firestore, databases', color: '#16a34a' },
  lb: { group: 'network', name: 'Load Balancers', short: 'ALB, NLB, traffic distribution', color: '#0284c7' },
  dns: { group: 'network', name: 'DNS & CDN', short: 'Route53, CloudFront, global distribution', color: '#0891b2' },
};

export const CLOUD_GROUPS = [
  { id: 'network', title: 'Networking', color: '#0891b2', components: ['vpc', 'lb', 'dns'] },
  { id: 'security', title: 'Security', color: '#dc2626', components: ['iam'] },
  { id: 'compute', title: 'Compute', color: '#7c3aed', components: ['compute'] },
  { id: 'storage', title: 'Storage', color: '#16a34a', components: ['storage', 'db'] },
];

export const CLOUD_FLOWS = [
  ['vpc', 'compute'],
  ['compute', 'storage'],
  ['compute', 'db'],
  ['lb', 'compute'],
  ['dns', 'lb'],
];

export const CLOUD_JOURNEY = [
  { title: 'Design network', desc: 'VPC with public/private subnets, NAT, routing.', actor: 'network' },
  { title: 'Configure IAM', desc: 'Roles, policies, service accounts, OIDC.', actor: 'iam' },
  { title: 'Launch compute', desc: 'VMs, clusters, serverless functions.', actor: 'compute' },
  { title: 'Attach storage', desc: 'Object storage, databases, ephemeral volumes.', actor: 'storage' },
  { title: 'Setup LB & DNS', desc: 'Load balancer distributes traffic; DNS routes users.', actor: 'lb' },
];

export const CLOUD_TOPIC = {
  id: 'cloud',
  name: 'Cloud Foundations',
  short: 'VPCs, IAM, compute, storage, load balancers, DNS.',
  accent: '#0891b2',
  accentSoft: '#cffafe',
  heroTitle: 'Building on the cloud: VPCs, IAM, compute, and storage.',
  heroLead: 'Cloud fundamentals across AWS, GCP, and Azure: networking, identity, resources, and architecture patterns.',
  heroStats: ['7 core services', 'multi-cloud comparison', 'cloud architecture'],
  components: CLOUD_COMPONENTS,
  groups: CLOUD_GROUPS,
  flows: CLOUD_FLOWS,
  journey: CLOUD_JOURNEY,
};

export default CLOUD_TOPIC;
