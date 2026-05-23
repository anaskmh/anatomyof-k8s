/* Monitoring & Observability Topic Data */
export const MONITORING_COMPONENTS = {
  prometheus: {
    group: 'collection',
    name: 'Prometheus',
    short: 'Time-series metrics database',
    color: '#dc2626',
    tag: 'COLLECTION',
    intro: 'Prometheus scrapes metrics from applications and infrastructure. Pull-based monitoring with powerful query language (PromQL).',
  },
  grafana: {
    group: 'visualization',
    name: 'Grafana',
    short: 'Dashboards and visualization',
    color: '#16a34a',
    tag: 'VISUALIZATION',
    intro: 'Turn metrics into dashboards and alerts. Query any data source (Prometheus, Loki, cloud APIs).',
  },
  loki: {
    group: 'collection',
    name: 'Loki',
    short: 'Log aggregation with label-based indexing',
    color: '#0284c7',
    tag: 'COLLECTION',
    intro: 'Lightweight log aggregation. Labels instead of full-text indexing reduce storage costs.',
  },
  jaeger: {
    group: 'tracing',
    name: 'Jaeger',
    short: 'Distributed tracing',
    color: '#7c3aed',
    tag: 'TRACING',
    intro: 'Trace requests across microservices. Visualize latency and dependencies.',
  },
  alertmanager: {
    group: 'alerting',
    name: 'AlertManager',
    short: 'Alert routing and deduplication',
    color: '#ea580c',
    tag: 'ALERTING',
    intro: 'Group, deduplicate, and route alerts to Slack, PagerDuty, email.',
  },
  slo: {
    group: 'sre',
    name: 'SLOs & Error Budgets',
    short: 'Service level objectives',
    color: '#059669',
    tag: 'SRE',
    intro: 'Define acceptable downtime. Use error budgets to decide when to focus on stability vs features.',
  },
};

export const MONITORING_GROUPS = [
  { id: 'collection', title: 'Collection', color: '#dc2626', components: ['prometheus', 'loki'] },
  { id: 'visualization', title: 'Visualization', color: '#16a34a', components: ['grafana'] },
  { id: 'tracing', title: 'Tracing', color: '#7c3aed', components: ['jaeger'] },
  { id: 'alerting', title: 'Alerting', color: '#ea580c', components: ['alertmanager'] },
  { id: 'sre', title: 'SRE & SLOs', color: '#059669', components: ['slo'] },
];

export const MONITORING_SECONDARY_SECTIONS = [
  { id: 'collection', title: 'Collection', color: '#dc2626', components: ['prometheus', 'loki'] },
  { id: 'visualization', title: 'Visualization', color: '#16a34a', components: ['grafana'] },
  { id: 'tracing', title: 'Tracing', color: '#7c3aed', components: ['jaeger'] },
  { id: 'alerting', title: 'Alerting', color: '#ea580c', components: ['alertmanager'] },
  { id: 'sre', title: 'SRE & SLOs', color: '#059669', components: ['slo'] },
];

export const MONITORING_FLOWS = [
  ['prometheus', 'grafana'],
  ['loki', 'grafana'],
  ['jaeger', 'grafana'],
  ['grafana', 'alertmanager'],
];

export const MONITORING_JOURNEY = [
  { title: 'Application emits metrics', desc: 'App pushes CPU, memory, requests/sec to Prometheus.', actor: 'app' },
  { title: 'Prometheus scrapes', desc: 'Prometheus pulls metrics every 15 seconds.', actor: 'prometheus' },
  { title: 'Metrics stored', desc: 'Time-series data indexed and stored efficiently.', actor: 'storage' },
  { title: 'Query & visualize', desc: 'Grafana queries Prometheus, renders dashboard.', actor: 'grafana' },
  { title: 'Rules evaluated', desc: 'Alert rules (CPU > 80%) are checked continuously.', actor: 'rules' },
  { title: 'Alert fired', desc: 'Threshold exceeded; AlertManager routes to Slack.', actor: 'alert' },
];

export const MONITORING_TOPIC = {
  id: 'monitoring',
  name: 'Monitoring & Observability',
  short: 'Metrics, logs, traces, SLOs, dashboards, and alerts.',
  accent: '#dc2626',
  accentSoft: '#fecaca',
  heroTitle: 'See what is happening: metrics, logs, and traces.',
  heroLead: 'Understanding observability: how to collect, visualize, and alert on system behavior. Learn MELT: Metrics, Events, Logs, Traces.',
  heroStats: ['6 key tools', 'MELT model', 'SLO framework'],
  components: MONITORING_COMPONENTS,
  groups: MONITORING_GROUPS,
  secondarySections: MONITORING_SECONDARY_SECTIONS,
  flows: MONITORING_FLOWS,
  journey: MONITORING_JOURNEY,
};

export default MONITORING_TOPIC;
