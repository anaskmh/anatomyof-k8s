import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Search, Play, Pause, ExternalLink, BookOpen, Github, Linkedin, Menu } from 'lucide-react';
import './styles/responsive.css';
import './styles/animations.css';
import { useResponsive, useModal } from './hooks/useResponsive';
import MobileNav from './components/MobileNav/MobileNav';
import { CICD_TOPIC } from './data/cicd';
import { TERRAFORM_TOPIC } from './data/terraform';
import { MONITORING_TOPIC } from './data/monitoring';
import { LINUX_TOPIC } from './data/linux';
import { CLOUD_TOPIC } from './data/cloud';
import { GITOPS_TOPIC } from './data/gitops';

// ============================================================
// COMPONENT DATA — every Kubernetes component with real examples
// ============================================================
const KUBERNETES_COMPONENTS = {
  // ---------- USER SIDE ----------
  user: {
    group: 'client',
    name: 'Developer / User',
    short: 'The human who submits workloads',
    color: '#0f172a',
    tag: 'CLIENT',
    intro: 'The entry point. A developer, SRE, or CI pipeline that wants to deploy or manage something on the cluster. Not part of Kubernetes itself, but where every interaction begins.',
    deepDive: 'In modern teams, "the user" is rarely a person typing kubectl — it is usually a CI/CD pipeline (GitHub Actions, GitLab CI, Jenkins) or a GitOps operator (ArgoCD, Flux) that continuously reconciles the cluster against a Git repository. Every one of these actors eventually hits the same authenticated REST endpoint: the kube-apiserver. Understanding who is allowed to do what is controlled by RBAC bindings attached to the user\'s identity (client certificate, OIDC token, or ServiceAccount token).',
    example: {
      scenario: 'A backend engineer at a startup wants to deploy a new version of the checkout API.',
      action: 'She opens her terminal, checks her current cluster context, and runs kubectl apply.',
      code: '$ kubectl config current-context\nprod-cluster\n$ kubectl apply -f checkout-v2.yaml',
    },
    responsibilities: [
      'Author manifests describing desired state (YAML/JSON)',
      'Authenticate with the cluster via kubeconfig',
      'Trigger actions through kubectl, client libraries, or GitOps tools (ArgoCD, Flux)',
    ],
    docUrl: 'https://kubernetes.io/docs/reference/access-authn-authz/authentication/',
    docLabel: 'Authenticating users',
  },
  kubectl: {
    group: 'client',
    name: 'kubectl',
    short: 'Official CLI for Kubernetes',
    color: '#2563eb',
    tag: 'CLI',
    intro: 'The command-line client. Translates human commands into authenticated REST calls against the API Server. It is not part of the cluster — it is a client.',
    example: {
      scenario: 'You want to see all pods failing in the payments namespace.',
      action: 'kubectl reads your kubeconfig, finds the cluster URL & cert, and makes a GET request to /api/v1/namespaces/payments/pods.',
      code: '$ kubectl get pods -n payments --field-selector=status.phase=Failed\nNAME                READY   STATUS   RESTARTS\ncharge-7f9c-p2ll    0/1     Error    5',
    },
    responsibilities: [
      'Parse commands and YAML files',
      'Resolve context, cluster URL, credentials from ~/.kube/config',
      'Serialize requests as REST calls to the API Server',
      'Format responses as tables, JSON, or YAML',
    ],
    deepDive: 'kubectl is a Go binary that reads ~/.kube/config, picks the current context (cluster + user + namespace), and turns every subcommand into an authenticated HTTP call. Behind commands like `kubectl get`, `kubectl apply`, `kubectl logs`, and `kubectl exec` are straightforward REST verbs (GET, POST, PATCH) plus SPDY/WebSocket upgrades for streaming. Everything kubectl can do, a client library can do — which is why CI pipelines, the Kubernetes Dashboard, k9s, and Lens are all just different UIs over the same API.',
    docUrl: 'https://kubernetes.io/docs/reference/kubectl/',
    docLabel: 'kubectl command reference',
  },

  // ---------- CONTROL PLANE ----------
  api: {
    group: 'control-plane',
    name: 'kube-apiserver',
    short: 'The front door of the cluster',
    color: '#7c3aed',
    tag: 'CONTROL PLANE',
    intro: 'The only component that talks to etcd. Every kubectl command, every controller, every kubelet — they all route through the API Server. It is stateless and horizontally scalable.',
    example: {
      scenario: 'kubectl apply -f deploy.yaml arrives as an HTTPS POST to :6443.',
      action: 'API Server runs: (1) TLS auth, (2) RBAC check, (3) admission webhooks, (4) schema validation, (5) etcd write. Only then does it return 201 Created.',
      code: 'POST /apis/apps/v1/namespaces/prod/deployments\nAuthorization: Bearer eyJhbGciOi...\n→ 201 Created  resourceVersion: 48291',
    },
    responsibilities: [
      'Authenticate every request (certs, tokens, OIDC, webhooks)',
      'Authorize via RBAC / ABAC / webhook policies',
      'Run mutating & validating admission controllers',
      'Persist objects to etcd as the single source of truth',
      'Serve watch streams so controllers see changes in real time',
    ],
    deepDive: 'The API server is deliberately the only component that touches etcd. This chokepoint gives Kubernetes a single enforcement point for authentication, authorization, admission control, validation, defaulting, and versioning. It exposes the API in two major forms: the core group at /api/v1/... and named groups at /apis/<group>/<version>/... . Thanks to watch streams over long-lived HTTP connections, controllers and kubelets are notified of changes in milliseconds — this is the foundation of the whole reconciliation model.',
    docUrl: 'https://kubernetes.io/docs/concepts/overview/components/#kube-apiserver',
    docLabel: 'kube-apiserver overview',
  },
  etcd: {
    group: 'control-plane',
    name: 'etcd',
    short: 'Distributed key-value store',
    color: '#d97706',
    tag: 'CONTROL PLANE',
    intro: 'A strongly consistent, Raft-based KV store. Holds the entire state of the cluster — every pod, secret, configmap, node. Lose etcd, lose the cluster.',
    example: {
      scenario: 'You create a Secret named stripe-key.',
      action: 'API Server writes it to etcd under /registry/secrets/prod/stripe-key. Raft replicates to all etcd peers. Only when a quorum acknowledges is the write acknowledged back to kubectl.',
      code: '$ etcdctl get /registry/secrets/prod/stripe-key\n/registry/secrets/prod/stripe-key\nk8s\\x00\\nv1\\x12Secret\\x1a...',
    },
    responsibilities: [
      'Persist every API object with strong consistency',
      'Replicate writes across control-plane peers via Raft',
      'Serve watches — the foundation of all controller reconciliation',
      'Guarantee atomic updates through resourceVersion',
      'Support encryption-at-rest for secrets',
    ],
    deepDive: 'etcd is not Kubernetes-specific — it is a general-purpose, strongly consistent key-value store built on the Raft consensus algorithm. In a production cluster, etcd runs as an odd number of members (typically 3 or 5) across control-plane nodes to tolerate failures. Every write goes through a leader, is replicated to a quorum of followers, and only then returns success. This is why etcd latency directly affects kubectl responsiveness — and why backing up etcd is the single most important disaster-recovery practice.',
    docUrl: 'https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/',
    docLabel: 'Operating etcd for Kubernetes',
  },
  scheduler: {
    group: 'control-plane',
    name: 'kube-scheduler',
    short: 'Decides which node runs which pod',
    color: '#7c3aed',
    tag: 'CONTROL PLANE',
    intro: 'Watches for pods with nodeName="" and picks the best node. Two stages: filtering (hard constraints) and scoring (soft preferences). Does not run workloads — only makes placement decisions.',
    example: {
      scenario: 'A pod requests 4 CPU, 8Gi RAM, a GPU, and nodeAffinity for zone us-east-1a.',
      action: 'Filter stage eliminates 7 of 10 nodes (not enough memory, no GPU, wrong zone). Score stage ranks the 3 survivors: node-gpu-2 wins on least-utilization. Scheduler PATCHes the pod with nodeName: node-gpu-2.',
      code: 'Filtered: 3/10 nodes passed\nnode-gpu-1: score 58\nnode-gpu-2: score 72 ✓\nnode-gpu-3: score 61\n→ Bound pod ml-trainer to node-gpu-2',
    },
    responsibilities: [
      'Filter nodes by hard constraints (resources, taints, affinity, topology)',
      'Score surviving nodes by preferences (spread, bin-packing, zone balance)',
      'Bind the pod to the highest-scoring node via the API Server',
      'Support pluggable scheduler frameworks and custom schedulers',
    ],
    deepDive: 'The scheduler is fundamentally a matchmaker. It does not place pods itself — it writes a binding (pod → node) through the API, and the target kubelet takes it from there. The default scheduler is built on the scheduling framework: a plugin system where each phase (PreFilter, Filter, PostFilter, PreScore, Score, Reserve, Permit, PreBind, Bind) is implemented by plugins. You can swap algorithms, add custom scheduling constraints (topology spread, pod affinity, gang scheduling for ML workloads), or run multiple schedulers side-by-side.',
    docUrl: 'https://kubernetes.io/docs/concepts/scheduling-eviction/kube-scheduler/',
    docLabel: 'kube-scheduler concepts',
  },
  'controller-manager': {
    group: 'control-plane',
    name: 'kube-controller-manager',
    short: 'Runs all the built-in control loops',
    color: '#7c3aed',
    tag: 'CONTROL PLANE',
    intro: 'A single binary hosting dozens of independent controllers. Each watches one object type and continuously reconciles reality with the desired state. The beating heart of declarative Kubernetes.',
    example: {
      scenario: 'You set replicas: 5 on a Deployment. A pod crashes.',
      action: 'Deployment controller sees the new replicas. Creates/updates a ReplicaSet. ReplicaSet controller observes 4 running pods, creates 1 more pod object. Node controller notices the crashed pod\'s node is still healthy, so nothing else happens.',
      code: 'ReplicaSet reconcile:\n  observed: 4 running\n  desired:  5\n  diff:     +1\n  → POST /pods { name: api-b7d2 }',
    },
    responsibilities: [
      'Deployment controller: manages rolling updates & rollbacks',
      'ReplicaSet controller: keeps replica count correct',
      'Node controller: detects node failures, evicts pods after 5min',
      'Endpoints / EndpointSlice: maps Services → Pod IPs',
      'Job, CronJob, StatefulSet, DaemonSet, PVC controllers',
      'Elects a leader for HA (only one instance reconciles at a time)',
    ],
    deepDive: 'The controller manager is not one loop — it is many. Each controller follows the same pattern: watch a resource type, compare observed state to desired state, take action to close the gap, repeat forever. This "level-based" (not edge-based) design means missed events don\'t matter: the next reconciliation will still converge. This pattern is so central that when you write a Kubernetes Operator, you are effectively adding another controller to this family, using the same client-go informer/workqueue machinery.',
    docUrl: 'https://kubernetes.io/docs/concepts/architecture/controller/',
    docLabel: 'Controllers in Kubernetes',
  },
  'cloud-controller': {
    group: 'control-plane',
    name: 'cloud-controller-manager',
    short: 'Cloud-provider-specific loops',
    color: '#7c3aed',
    tag: 'CONTROL PLANE',
    intro: 'Split out from kube-controller-manager so Kubernetes itself stays cloud-agnostic. Runs controllers that talk to AWS / GCP / Azure / DO APIs to provision load balancers, attach volumes, and manage node lifecycle.',
    example: {
      scenario: 'You create a Service of type: LoadBalancer on EKS.',
      action: 'Service controller (inside cloud-controller-manager) calls the AWS ELB API, provisions an NLB, waits for the DNS name, and patches the Service status with the external hostname.',
      code: '$ kubectl get svc checkout\nNAME       TYPE           EXTERNAL-IP\ncheckout   LoadBalancer   a1b2c3.elb.us-east-1.amazonaws.com',
    },
    responsibilities: [
      'Node controller: registers new cloud VMs as nodes, deletes nodes when VMs are terminated',
      'Route controller: sets up cloud routing tables for pod CIDRs',
      'Service controller: provisions cloud load balancers for LoadBalancer services',
    ],
    deepDive: 'Kubernetes used to bake cloud-provider code directly into kube-controller-manager and kubelet. That made it impossible to release Kubernetes on its own schedule without coordinating with every cloud vendor. The cloud-controller-manager solves this by pulling cloud-specific controllers into their own binary, shipped by the cloud provider (AWS, GCP, Azure, DigitalOcean, Linode, etc.). Running Kubernetes on bare metal? You simply skip this component.',
    docUrl: 'https://kubernetes.io/docs/concepts/architecture/cloud-controller/',
    docLabel: 'Cloud Controller Manager',
  },

  // ---------- WORKER NODE ----------
  kubelet: {
    group: 'worker-node',
    name: 'kubelet',
    short: 'Node agent — makes pods real',
    color: '#16a34a',
    tag: 'WORKER NODE',
    intro: 'Runs on every node. Watches the API Server for pods bound to its node, then tells the container runtime to actually create them. Also runs probes and reports status back.',
    example: {
      scenario: 'Scheduler binds pod web-a7f3 to node-04.',
      action: 'kubelet on node-04 sees the new pod via its watch. It pulls nginx:1.25 from the registry, calls CRI RunPodSandbox + CreateContainer + StartContainer, mounts the configmap, starts liveness probes, and reports status: Running.',
      code: 'kubelet/node-04 → CRI\n  PullImage(nginx:1.25)   ✓ 2.3s\n  RunPodSandbox()         ✓ 0.1s\n  CreateContainer()       ✓ 0.2s\n  StartContainer()        ✓ 0.05s',
    },
    responsibilities: [
      'Watch API Server for pods assigned to this node',
      'Pull images and call the Container Runtime Interface (CRI)',
      'Run liveness, readiness, and startup probes',
      'Mount volumes through CSI plugins',
      'Expose secrets & configmaps as files or env vars',
      'Report node status (kubelet heartbeat) and pod status every 10s',
    ],
    deepDive: 'kubelet is the single source of truth for what is actually running on a node. It accepts PodSpecs from multiple sources (primarily the API server, but also static pod files in /etc/kubernetes/manifests), and makes them real via the CRI. Every ten seconds it reports node status (conditions, capacity, allocatable) and pod statuses back to the API server. If the heartbeat is lost for too long (default 40s), the node controller marks the node NotReady and begins evicting pods after the tolerationSeconds period.',
    docUrl: 'https://kubernetes.io/docs/concepts/overview/components/#kubelet',
    docLabel: 'kubelet component reference',
  },
  'kube-proxy': {
    group: 'worker-node',
    name: 'kube-proxy',
    short: 'Service → Pod network plumbing',
    color: '#16a34a',
    tag: 'WORKER NODE',
    intro: 'The L4 network plumber on every node. Implements Kubernetes Services by programming iptables, IPVS, or nftables rules so a ClusterIP reaches the right pod IPs, even as pods come and go.',
    example: {
      scenario: 'Service checkout has ClusterIP 10.96.42.7 and 3 pod endpoints. A pod dies, a new one starts.',
      action: 'EndpointSlice is updated. kube-proxy on every node sees the change, rewrites its iptables rules so traffic to 10.96.42.7:80 now DNATs to the new set of pod IPs with equal probability.',
      code: 'iptables -t nat -L KUBE-SVC-CHECKOUT\n-j KUBE-SEP-ABC  (prob 0.333)\n-j KUBE-SEP-DEF  (prob 0.500)\n-j KUBE-SEP-GHI  (prob 1.000)',
    },
    responsibilities: [
      'Translate Service virtual IPs to pod IPs',
      'Keep routing rules in sync as pods/endpoints change',
      'Round-robin load-balance across healthy endpoints',
      'Handle NodePort translation (host port → service)',
      'Support iptables, IPVS, and nftables backends',
    ],
    deepDive: 'kube-proxy is the reason `curl http://my-service` works from any pod in the cluster. It watches Services and EndpointSlices and programs the kernel\'s packet-filtering layer (iptables is the default; IPVS is faster for clusters with thousands of services; nftables is the modern replacement). Newer CNIs like Cilium can replace kube-proxy entirely using eBPF, which skips iptables and delivers packets directly to pods with much lower latency.',
    docUrl: 'https://kubernetes.io/docs/reference/command-line-tools-reference/kube-proxy/',
    docLabel: 'kube-proxy reference',
  },
  'container-runtime': {
    group: 'worker-node',
    name: 'Container Runtime',
    short: 'Actually runs containers',
    color: '#16a34a',
    tag: 'WORKER NODE',
    intro: 'The software that creates and runs containers. kubelet never talks to containers directly — it speaks gRPC over the Container Runtime Interface (CRI). Modern runtimes: containerd, CRI-O.',
    example: {
      scenario: 'kubelet asks the runtime to start a pod with nginx:1.25.',
      action: 'containerd pulls the OCI image (layers from a registry), unpacks it to an overlayfs mount, creates Linux namespaces (PID, NET, MNT, UTS, IPC), applies cgroups for resource limits, then exec\'s nginx as PID 1 inside the container.',
      code: '$ ctr -n k8s.io containers list\nCONTAINER      IMAGE                  RUNTIME\nnginx-abc123   docker.io/nginx:1.25   io.containerd.runc.v2',
    },
    responsibilities: [
      'Pull OCI-compliant images from registries',
      'Create Linux namespaces and cgroups for isolation',
      'Launch and terminate container processes',
      'Stream logs and exec connections back to kubelet',
      'Report container state changes via CRI events',
    ],
    deepDive: 'Kubernetes removed Docker as a runtime in v1.24. Not because Docker was bad — because Docker had grown into a user-facing tool that included a runtime, and kubelet only needed the runtime. Today, containerd (extracted from Docker) and CRI-O are the two dominant CRI implementations. Both use runc under the hood to create the actual Linux containers, following the OCI runtime spec. The image you build with `docker build` is OCI-compliant and runs identically on either.',
    docUrl: 'https://kubernetes.io/docs/setup/production-environment/container-runtimes/',
    docLabel: 'Container Runtimes guide',
  },
  pod: {
    group: 'worker-node',
    name: 'Pod',
    short: 'Smallest deployable unit',
    color: '#ea580c',
    tag: 'WORKLOAD',
    intro: 'One or more containers that share a network namespace (same IP, same ports), IPC, and optionally volumes. Pods are disposable — replaced rather than repaired.',
    example: {
      scenario: 'A web app pod runs nginx + a sidecar that ships logs.',
      action: 'Both containers share pod IP 10.244.1.5. nginx writes to /var/log/nginx/, the sidecar reads from the same shared emptyDir volume and ships to Loki. They restart and die together.',
      code: 'apiVersion: v1\nkind: Pod\nspec:\n  containers:\n  - name: web\n    image: nginx:1.25\n  - name: log-shipper\n    image: promtail:2.9',
    },
    responsibilities: [
      'Host the actual application container(s)',
      'Provide a shared network namespace (one IP for all containers)',
      'Share mounted volumes among containers',
      'Be disposable — replaced on failure, not healed',
    ],
    deepDive: 'Pods exist to solve a specific problem: sometimes a single logical "instance" of your app needs multiple tightly coupled processes that share memory, networking, and local storage. The canonical example is a sidecar: your app container plus a log-shipping, mTLS-proxy, or metrics-scraping container that lives and dies with it. Pods themselves are ephemeral; you almost never create them directly. Instead you create a higher-level controller (Deployment, StatefulSet, Job) that creates pods for you and replaces them on failure.',
    docUrl: 'https://kubernetes.io/docs/concepts/workloads/pods/',
    docLabel: 'Pods concept guide',
  },

  // ---------- WORKLOAD ABSTRACTIONS ----------
  deployment: {
    group: 'workload',
    name: 'Deployment',
    short: 'Rolling-update pod manager',
    color: '#db2777',
    tag: 'WORKLOAD API',
    intro: 'The most common way to run stateless apps. Manages a ReplicaSet for you, and handles rolling updates, rollbacks, and pause/resume.',
    example: {
      scenario: 'You change the image from api:v1 to api:v2.',
      action: 'Deployment creates a new ReplicaSet for v2, scales it up one pod at a time while scaling the v1 ReplicaSet down — respecting maxSurge (1) and maxUnavailable (0). After success, keeps v1 ReplicaSet around at size 0 for rollback.',
      code: '$ kubectl rollout status deploy/api\nWaiting... 2 of 5 updated\nWaiting... 4 of 5 updated\ndeployment "api" successfully rolled out',
    },
    responsibilities: [
      'Declare desired replicas and pod template',
      'Orchestrate rolling updates with configurable strategy',
      'Maintain revision history for rollback',
      'Pause/resume deployments for gated rollouts',
    ],
    deepDive: 'Deployments implement declarative rolling updates using a clever trick: they never modify pods in place. Changing the image from v1 to v2 creates a brand-new ReplicaSet for v2 and scales the old one down, one pod at a time. This gives you atomic rollouts, instant rollback (just scale the old ReplicaSet back up), and safe coexistence during transitions. Strategy parameters `maxSurge` and `maxUnavailable` let you trade rollout speed against extra capacity.',
    docUrl: 'https://kubernetes.io/docs/concepts/workloads/controllers/deployment/',
    docLabel: 'Deployments concept guide',
  },
  replicaset: {
    group: 'workload',
    name: 'ReplicaSet',
    short: 'Ensures N identical pods exist',
    color: '#db2777',
    tag: 'WORKLOAD API',
    intro: 'The controller that keeps exactly N copies of a pod template running. Almost always created by a Deployment — rarely used directly.',
    example: {
      scenario: 'ReplicaSet replicas: 3, but only 2 pods are running.',
      action: 'Controller observes the gap and creates a new pod. If 4 pods exist (e.g. after manual meddling), it deletes one to restore the count.',
      code: '$ kubectl get rs\nNAME         DESIRED   CURRENT   READY\napi-7f9c     3         3         3',
    },
    responsibilities: [
      'Create/delete pods to match replicas count',
      'Use label selectors to claim ownership of pods',
      'Handle pod failures by creating replacements',
    ],
    deepDive: 'ReplicaSets use label selectors to claim ownership of pods — meaning they will adopt any pod with matching labels, not just ones they created. This is usually what you want, but can cause surprises if two ReplicaSets have overlapping selectors. The Deployment controller carefully manages labels (adding pod-template-hash) to prevent this. In day-to-day work you rarely create ReplicaSets directly; the Deployment abstraction is better.',
    docUrl: 'https://kubernetes.io/docs/concepts/workloads/controllers/replicaset/',
    docLabel: 'ReplicaSet concept guide',
  },
  statefulset: {
    group: 'workload',
    name: 'StatefulSet',
    short: 'Stable identity for stateful apps',
    color: '#db2777',
    tag: 'WORKLOAD API',
    intro: 'For apps that need stable network IDs, ordered startup, and persistent storage per pod — databases, queues, Kafka, Zookeeper, Postgres clusters.',
    example: {
      scenario: 'You deploy a 3-node PostgreSQL cluster.',
      action: 'StatefulSet creates pods postgres-0, postgres-1, postgres-2 in order, each bound to its own PVC (data-postgres-0, data-postgres-1, ...). If postgres-1 is deleted, it comes back as postgres-1 with the same data, same DNS name, same identity.',
      code: 'postgres-0 → primary\npostgres-1 → replica (syncs from -0)\npostgres-2 → replica (syncs from -0)\nDNS: postgres-0.postgres.prod.svc',
    },
    responsibilities: [
      'Provide stable, ordered pod names (app-0, app-1, ...)',
      'Bind each pod to its own PersistentVolumeClaim',
      'Create and delete pods in order',
      'Guarantee predictable DNS names for peer discovery',
    ],
    deepDive: 'StatefulSets trade some flexibility (no random names, slow rollouts, ordered startup) for properties that stateful apps need: stable DNS identity, predictable ordinals, and per-replica persistent storage via volumeClaimTemplates. Each replica gets its own PVC (data-app-0, data-app-1, ...) that follows the pod across rescheduling events. This is the foundation for running databases (Postgres, MySQL), message queues (Kafka, RabbitMQ), and distributed systems (Zookeeper, Cassandra) on Kubernetes.',
    docUrl: 'https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/',
    docLabel: 'StatefulSet concept guide',
  },
  daemonset: {
    group: 'workload',
    name: 'DaemonSet',
    short: 'One pod per node',
    color: '#db2777',
    tag: 'WORKLOAD API',
    intro: 'Runs exactly one pod on every (matching) node. Perfect for node-level agents: log collectors, metric exporters, CNI plugins, storage daemons.',
    example: {
      scenario: 'You deploy the Fluent Bit log collector cluster-wide.',
      action: 'DaemonSet controller creates one Fluent Bit pod per worker node. When a new node joins the cluster, a pod is automatically scheduled on it. Each pod reads /var/log on its own host and ships to Elasticsearch.',
      code: '$ kubectl get ds -n logging\nNAME        DESIRED   CURRENT   READY\nfluent-bit  12        12        12    (1 per node)',
    },
    responsibilities: [
      'Ensure one pod per eligible node',
      'Automatically schedule on newly-joined nodes',
      'Support node selectors and tolerations for tainted nodes',
      'Manage rolling updates across nodes',
    ],
    deepDive: 'DaemonSets ensure a pod runs on every node that matches a node selector. They are the right tool for anything that must be node-local: CNI agents (Cilium, Calico), log collectors (Fluent Bit, Vector), metrics exporters (node_exporter, Datadog agent), CSI node plugins, GPU device plugins, service mesh sidecars, and security agents. DaemonSet pods are usually privileged and mount parts of the host filesystem.',
    docUrl: 'https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/',
    docLabel: 'DaemonSet concept guide',
  },
  job: {
    group: 'workload',
    name: 'Job / CronJob',
    short: 'Run-to-completion workloads',
    color: '#db2777',
    tag: 'WORKLOAD API',
    intro: 'Job runs a pod (or pods) until it exits successfully. CronJob runs Jobs on a schedule (like crontab). For batch work, migrations, backups, ML training.',
    example: {
      scenario: 'You need to run a database migration before your app starts.',
      action: 'A Job creates a pod running "alembic upgrade head". Job watches for successful exit. If it fails, Job retries up to backoffLimit: 6 times. Once it completes, the pod stays (for logs) but isn\'t restarted.',
      code: 'apiVersion: batch/v1\nkind: CronJob\nspec:\n  schedule: "0 3 * * *"   # 3 AM daily\n  jobTemplate:\n    spec:\n      template:\n        spec:\n          containers:\n          - image: backup:latest',
    },
    responsibilities: [
      'Run pods until they exit with status 0',
      'Retry failed pods up to backoffLimit',
      'Support parallelism (run N pods concurrently)',
      'CronJob: create Jobs on a schedule',
    ],
    deepDive: 'A Job runs one or more pods until a specified number of them successfully complete. CronJob is a simple wrapper that creates Jobs on a schedule. Use Jobs for database migrations, one-off cleanups, batch processing, nightly backups, ML training runs, and CI-like workloads. Tune `completions`, `parallelism`, `backoffLimit`, and `activeDeadlineSeconds` to get the retry/parallelism behavior you want.',
    docUrl: 'https://kubernetes.io/docs/concepts/workloads/controllers/job/',
    docLabel: 'Jobs concept guide',
  },

  // ---------- NETWORKING ----------
  service: {
    group: 'networking',
    name: 'Service',
    short: 'Stable virtual IP & DNS for pods',
    color: '#0891b2',
    tag: 'NETWORKING',
    intro: 'Pods die and get new IPs. Services give you a stable IP and DNS name that load-balances across the current set of pod replicas via a label selector.',
    example: {
      scenario: 'Your frontend needs to reach the backend, whose pods come and go.',
      action: 'You create Service name: backend, selector: app=backend. kube-dns creates backend.prod.svc.cluster.local → 10.96.42.7. The frontend calls http://backend, which reaches any healthy backend pod through kube-proxy.',
      code: 'apiVersion: v1\nkind: Service\nspec:\n  selector: { app: backend }\n  ports:\n  - port: 80\n    targetPort: 8080\n  type: ClusterIP',
    },
    responsibilities: [
      'Allocate a stable ClusterIP and DNS name',
      'Track pods matching its selector via EndpointSlice',
      'Support ClusterIP, NodePort, LoadBalancer, ExternalName types',
      'Load-balance L4 traffic across healthy endpoints',
    ],
    deepDive: 'A Service is an abstraction that decouples callers from the current set of pod IPs. Internally, a Service has a stable ClusterIP (routed by kube-proxy) and a DNS name (served by CoreDNS). Types: ClusterIP (in-cluster only), NodePort (exposes a port on every node), LoadBalancer (provisions a cloud LB), ExternalName (CNAME alias). For pods that need stable DNS per-instance (like StatefulSets), you use a headless Service (clusterIP: None) that returns the individual pod IPs.',
    docUrl: 'https://kubernetes.io/docs/concepts/services-networking/service/',
    docLabel: 'Service concept guide',
  },
  ingress: {
    group: 'networking',
    name: 'Ingress',
    short: 'L7 HTTP/HTTPS routing',
    color: '#0891b2',
    tag: 'NETWORKING',
    intro: 'Routes external HTTP/HTTPS traffic to Services based on hostname and path. Needs an Ingress Controller (Nginx, Traefik, HAProxy, Istio) to actually implement the rules.',
    example: {
      scenario: 'api.example.com/v1/* should go to api-v1 service, api.example.com/v2/* to api-v2.',
      action: 'An Ingress object defines these rules. The Nginx Ingress Controller watches Ingress objects and rewrites its nginx.conf to match. TLS cert for api.example.com comes from cert-manager + Let\'s Encrypt.',
      code: 'rules:\n- host: api.example.com\n  http:\n    paths:\n    - path: /v1\n      backend: { service: api-v1 }\n    - path: /v2\n      backend: { service: api-v2 }',
    },
    responsibilities: [
      'Define HTTP host/path routing rules',
      'Terminate TLS with certs from Secrets',
      'Support path rewrites, redirects, middleware',
      'Delegate actual implementation to an Ingress Controller',
    ],
    deepDive: 'Ingress is an L7 (HTTP/HTTPS) gateway into your cluster. The Ingress object describes the desired routing rules; an Ingress Controller (nginx-ingress, Traefik, HAProxy, cloud-native options like AWS ALB Controller) continuously watches those objects and reconfigures a real reverse proxy accordingly. For more advanced needs (TCP, gRPC, header-based routing, rate limiting), the newer Gateway API is Kubernetes\' evolved replacement.',
    docUrl: 'https://kubernetes.io/docs/concepts/services-networking/ingress/',
    docLabel: 'Ingress concept guide',
  },
  'network-policy': {
    group: 'networking',
    name: 'NetworkPolicy',
    short: 'Pod-level firewall rules',
    color: '#0891b2',
    tag: 'NETWORKING',
    intro: 'Zero-trust network inside the cluster. Defines which pods can talk to which pods (and to external CIDRs) using label selectors. Requires a CNI that implements policies (Calico, Cilium).',
    example: {
      scenario: 'Your payment service should only be callable from the checkout service.',
      action: 'A NetworkPolicy on app=payment says: allow ingress only from pods with label app=checkout on port 8080. Calico translates this to eBPF/iptables rules. All other traffic (even from other namespaces) is dropped.',
      code: 'kind: NetworkPolicy\nspec:\n  podSelector: { app: payment }\n  ingress:\n  - from:\n    - podSelector: { app: checkout }\n    ports:\n    - port: 8080',
    },
    responsibilities: [
      'Define ingress/egress rules by label selectors',
      'Support namespace-level and IP-block selectors',
      'Default-deny when any policy selects a pod',
      'Require a policy-enforcing CNI plugin',
    ],
    deepDive: 'By default, every pod in a Kubernetes cluster can talk to every other pod. NetworkPolicies let you tighten that to a zero-trust model by selecting pods (by labels) and specifying allowed ingress/egress traffic. Crucially, they only work if your CNI supports them — Flannel alone does not, but Calico, Cilium, Antrea, and Weave all do. The moment you apply any NetworkPolicy to a pod, that pod becomes default-deny and only allowed flows get through.',
    docUrl: 'https://kubernetes.io/docs/concepts/services-networking/network-policies/',
    docLabel: 'Network Policies concept guide',
  },
  cni: {
    group: 'networking',
    name: 'CNI Plugin',
    short: 'Cluster networking backbone',
    color: '#0891b2',
    tag: 'NETWORKING',
    intro: 'Container Network Interface. Provides pod-to-pod connectivity across nodes, assigns IPs, and often implements NetworkPolicies. Examples: Calico, Cilium, Flannel, Weave.',
    example: {
      scenario: 'Pod A on node-1 (10.244.1.5) needs to reach Pod B on node-3 (10.244.3.8).',
      action: 'Cilium on node-1 encapsulates the packet (VXLAN or eBPF direct routing), sends it to node-3, where Cilium decapsulates and delivers to Pod B — as if they were on the same network. No NAT, no proxying.',
      code: '$ cilium status\nKubernetesAPI:   Ok\nKubernetes:      1.30\nCilium:          Ok 1.15.0\nController Status: 48/48 healthy',
    },
    responsibilities: [
      'Assign IPs to pods from the cluster pod CIDR',
      'Route traffic between pods across nodes',
      'Implement NetworkPolicies (if supported)',
      'Provide observability: flow logs, Hubble, eBPF metrics',
    ],
    deepDive: 'The CNI specification is a simple contract: when a pod starts, the runtime calls a CNI plugin binary that assigns it an IP and wires up its network namespace; when the pod stops, the plugin tears it down. Everything above that is vendor magic — Flannel tunnels pod traffic via VXLAN, Calico uses BGP for native routing, Cilium programs eBPF for extreme performance and observability, Weave has its own overlay. Your choice affects network performance, NetworkPolicy support, and observability.',
    docUrl: 'https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/',
    docLabel: 'Network Plugins guide',
  },
  'core-dns': {
    group: 'networking',
    name: 'CoreDNS',
    short: 'Cluster DNS resolver',
    color: '#0891b2',
    tag: 'NETWORKING',
    intro: 'The DNS server for the cluster. Runs as pods. Resolves service names (backend.prod.svc.cluster.local) to ClusterIPs, and supports DNS for pods with hostname/subdomain.',
    example: {
      scenario: 'A pod runs `curl http://payments`.',
      action: 'The pod\'s /etc/resolv.conf points to CoreDNS (usually 10.96.0.10). CoreDNS receives the query, searches suffixes (prod.svc.cluster.local, svc.cluster.local, ...), finds Service payments, returns 10.96.12.33.',
      code: '$ nslookup payments\nServer:    10.96.0.10\nAddress:   10.96.0.10:53\nName:      payments.prod.svc.cluster.local\nAddress 1: 10.96.12.33',
    },
    responsibilities: [
      'Resolve Service and Pod DNS names inside the cluster',
      'Forward external queries to upstream resolvers',
      'Support custom plugins (rewrite, cache, prometheus)',
      'Scale horizontally — typically 2+ replicas',
    ],
    deepDive: 'CoreDNS replaced kube-dns as the default cluster DNS service in Kubernetes 1.13. It is a single binary composed of plugins — the default ConfigMap (Corefile) chains plugins like `kubernetes` (cluster-aware resolution), `forward` (to upstream resolvers), `cache`, `loop`, and `reload`. You can add plugins for rewriting, logging, Prometheus metrics, or custom backends. Pods have an NDots configuration (default 5) that affects how many suffixes are tried before an external lookup.',
    docUrl: 'https://kubernetes.io/docs/tasks/administer-cluster/coredns/',
    docLabel: 'Customizing DNS Service',
  },

  // ---------- STORAGE ----------
  pv: {
    group: 'storage',
    name: 'PersistentVolume (PV)',
    short: 'Cluster-scoped durable storage',
    color: '#0d9488',
    tag: 'STORAGE',
    intro: 'A piece of storage in the cluster — an EBS volume, GCE PD, NFS share, Ceph RBD. Provisioned by admins (static) or dynamically by a StorageClass.',
    example: {
      scenario: 'A Postgres pod requests 100Gi of fast SSD.',
      action: 'Dynamic provisioning: the gp3 StorageClass calls the AWS EBS CSI driver, creates a 100Gi gp3 volume, and a PV object appears representing it. When the pod is scheduled, the volume is attached to the node and mounted into the container.',
      code: '$ kubectl get pv\nNAME       CAPACITY   ACCESS    STATUS   CLAIM\npv-a7d9    100Gi      RWO       Bound    prod/data-postgres-0',
    },
    responsibilities: [
      'Represent a real storage backend in the cluster',
      'Expose capacity, access modes (RWO, ROX, RWX), reclaim policy',
      'Be claimed by a single PVC at a time',
      'Survive pod restarts — data persists',
    ],
    deepDive: 'A PV is a piece of cluster storage, either statically provisioned by an admin or dynamically created by a StorageClass. The split between PV (the resource) and PVC (the request) mirrors the split between Node and Pod — resources and requests for them are separate concepts. Reclaim policies determine what happens after a PVC is deleted: `Retain` keeps the data (manual cleanup), `Delete` destroys the underlying volume. Access modes (RWO, ROX, RWX, RWOP) constrain how pods can mount it.',
    docUrl: 'https://kubernetes.io/docs/concepts/storage/persistent-volumes/',
    docLabel: 'Persistent Volumes concept guide',
  },
  pvc: {
    group: 'storage',
    name: 'PersistentVolumeClaim (PVC)',
    short: 'A pod\'s request for storage',
    color: '#0d9488',
    tag: 'STORAGE',
    intro: 'The user-side request: "I need 100Gi of RWO storage from the gp3 class." Kubernetes binds it to a matching PV (or dynamically provisions one).',
    example: {
      scenario: 'A StatefulSet needs a PVC per replica.',
      action: 'volumeClaimTemplates creates data-postgres-0, data-postgres-1, data-postgres-2 — each 100Gi. Each PVC binds to its own PV. When a pod restarts, it reuses the same PVC → same data.',
      code: 'volumeClaimTemplates:\n- metadata: { name: data }\n  spec:\n    accessModes: [ "ReadWriteOnce" ]\n    storageClassName: gp3\n    resources: { requests: { storage: 100Gi } }',
    },
    responsibilities: [
      'Request storage by size, access mode, storage class',
      'Bind to a matching PV (or trigger dynamic provisioning)',
      'Be mounted into pods as a volume',
    ],
    deepDive: 'A PVC is the user-facing side of persistent storage — pods mount PVCs, not PVs. When you create a PVC without specifying a pre-existing PV, and a StorageClass matches, dynamic provisioning kicks in: the CSI driver is asked to create a new volume, which appears as a new PV, which is immediately bound to your PVC. PVCs also support online volume expansion (`allowVolumeExpansion: true`) and snapshots (`VolumeSnapshot` objects).',
    docUrl: 'https://kubernetes.io/docs/concepts/storage/persistent-volumes/#persistentvolumeclaims',
    docLabel: 'PersistentVolumeClaims',
  },
  'storage-class': {
    group: 'storage',
    name: 'StorageClass',
    short: 'Template for dynamic provisioning',
    color: '#0d9488',
    tag: 'STORAGE',
    intro: 'Describes a "class" of storage offered by a cluster. Parameters (disk type, IOPS, region) tell the CSI driver how to create a new PV when a PVC asks for this class.',
    example: {
      scenario: 'Your cluster offers "fast" (NVMe), "standard" (SSD), and "archive" (HDD) classes.',
      action: 'A PVC says storageClassName: fast. The StorageClass points to the AWS EBS CSI driver with parameters type: io2, iops: 16000. On bind, a matching EBS volume is created on demand.',
      code: 'kind: StorageClass\nmetadata: { name: fast }\nprovisioner: ebs.csi.aws.com\nparameters:\n  type: io2\n  iopsPerGB: "50"\nreclaimPolicy: Delete',
    },
    responsibilities: [
      'Map class name → CSI driver + parameters',
      'Enable dynamic PV provisioning',
      'Define reclaim policy (Delete / Retain)',
      'Specify volume binding mode (Immediate / WaitForFirstConsumer)',
    ],
    deepDive: 'A StorageClass tells Kubernetes "when a PVC asks for class X, use this CSI driver with these parameters to create a new volume." Typical clusters offer a handful of classes: one default general-purpose SSD, one high-IOPS class for databases, one cheap archive class. `volumeBindingMode: WaitForFirstConsumer` is almost always what you want — it delays volume creation until a pod is scheduled, avoiding volumes being created in zones where no compatible node exists.',
    docUrl: 'https://kubernetes.io/docs/concepts/storage/storage-classes/',
    docLabel: 'Storage Classes concept guide',
  },
  csi: {
    group: 'storage',
    name: 'CSI Driver',
    short: 'Storage backend plugin',
    color: '#0d9488',
    tag: 'STORAGE',
    intro: 'Container Storage Interface. A standard gRPC API that lets Kubernetes work with any storage system without baking it into core. AWS EBS, GCE PD, Ceph, Portworx, OpenEBS — all shipped as CSI drivers.',
    example: {
      scenario: 'A pod with a PVC gets scheduled to node-07.',
      action: 'kubelet calls the CSI driver: ControllerPublishVolume attaches the EBS volume to the EC2 instance; NodeStageVolume formats & mounts on the host; NodePublishVolume bind-mounts into the container.',
      code: 'CSI flow:\n1. Provision:   CreateVolume()\n2. Attach:      ControllerPublishVolume()\n3. Mount:       NodeStageVolume()\n4. Pod mount:   NodePublishVolume()',
    },
    responsibilities: [
      'Implement the CSI gRPC spec (Controller + Node services)',
      'Provision, attach, mount, unmount, delete volumes',
      'Handle snapshots, expansion, topology awareness',
      'Run as DaemonSet (Node plugin) + Deployment (Controller plugin)',
    ],
    deepDive: 'CSI is split into two plugins: a Controller plugin (runs as a Deployment, handles volume lifecycle: create, delete, attach, detach, snapshot, expand) and a Node plugin (runs as a DaemonSet, handles staging and mounting on each node). This separation lets the Controller plugin talk to the cloud API from anywhere while the Node plugin performs host-local operations. Almost every cloud storage integration today — EBS, Azure Disk, GCE PD, Ceph, Portworx, OpenEBS, Longhorn — ships as a CSI driver.',
    docUrl: 'https://kubernetes.io/docs/concepts/storage/volumes/#csi',
    docLabel: 'CSI volumes reference',
  },

  // ---------- CONFIG & SECURITY ----------
  configmap: {
    group: 'config',
    name: 'ConfigMap',
    short: 'Non-secret config as key-value',
    color: '#ca8a04',
    tag: 'CONFIG',
    intro: 'Stores configuration data separately from the container image. Mount as files or inject as environment variables. Perfect for app settings, feature flags, whole config files.',
    example: {
      scenario: 'Your app needs different log levels in staging vs prod.',
      action: 'Create a ConfigMap with LOG_LEVEL: debug in staging, LOG_LEVEL: warn in prod. Reference it in the Pod spec as envFrom. Change the ConfigMap → restart pods → new value applies.',
      code: 'kind: ConfigMap\nmetadata: { name: app-cfg }\ndata:\n  LOG_LEVEL: "warn"\n  FEATURE_CHECKOUT_V2: "true"\n  app.yaml: |\n    retries: 3\n    timeout: 5s',
    },
    responsibilities: [
      'Store non-sensitive configuration as key/value pairs',
      'Mount as a volume (each key becomes a file)',
      'Inject as environment variables',
      'Be namespace-scoped',
    ],
    deepDive: 'ConfigMaps hold up to 1 MiB of non-secret configuration data. They can be consumed four ways: as environment variables, as command-line args (via env), as files in a mounted volume (each key becomes a file), or via the Kubernetes API by apps that know how to read them. Mounted ConfigMap volumes update automatically when the ConfigMap changes (with some delay due to kubelet sync), but env vars are snapshotted at pod start — so changes require a restart.',
    docUrl: 'https://kubernetes.io/docs/concepts/configuration/configmap/',
    docLabel: 'ConfigMap concept guide',
  },
  secret: {
    group: 'config',
    name: 'Secret',
    short: 'Sensitive data (passwords, tokens)',
    color: '#ca8a04',
    tag: 'CONFIG',
    intro: 'Like a ConfigMap, but for sensitive data. Values are base64-encoded (not encrypted by default — enable encryption-at-rest!). Supports typed secrets: dockerconfigjson, tls, basic-auth.',
    example: {
      scenario: 'Your app needs a Stripe API key.',
      action: 'kubectl create secret generic stripe --from-literal=key=sk_live_xxx. In the pod, mount it as /etc/secrets/key. Or use a projected Volume with multiple secrets. Or fetch dynamically from Vault via CSI Secret Store.',
      code: '$ kubectl create secret generic stripe \\\n  --from-literal=api-key=sk_live_51H...\nsecret/stripe created',
    },
    responsibilities: [
      'Hold sensitive data outside the container image',
      'Be mounted as files or injected as env (avoid env — logs!)',
      'Support types: Opaque, dockerconfigjson, tls, service-account-token',
      'Integrate with external stores via CSI Secret Store',
    ],
    deepDive: 'Secrets are just ConfigMaps with a different name and base64-encoding. By default they are NOT encrypted at rest in etcd — you must explicitly enable EncryptionConfiguration on the API server (AES, kms provider). For sensitive workloads, most teams use an external system: HashiCorp Vault with the Vault Agent Injector, the External Secrets Operator (syncs from AWS Secrets Manager / GCP Secret Manager / Azure Key Vault), or the Secrets Store CSI Driver (mounts secrets as files without ever writing them to etcd).',
    docUrl: 'https://kubernetes.io/docs/concepts/configuration/secret/',
    docLabel: 'Secrets concept guide',
  },
  rbac: {
    group: 'config',
    name: 'RBAC (Role / RoleBinding)',
    short: 'Access control',
    color: '#ca8a04',
    tag: 'SECURITY',
    intro: 'Role-Based Access Control. Role = what actions on what resources. RoleBinding = attach a Role to a user/group/ServiceAccount. ClusterRole/Binding for cluster-wide permissions.',
    example: {
      scenario: 'The CI service account should be able to deploy to prod but not delete namespaces.',
      action: 'Create a Role deployer in namespace prod with verbs [get, list, create, update, patch] on deployments, services. Bind to the ServiceAccount ci. Attempts to delete namespace prod return 403 Forbidden.',
      code: 'kind: Role\nrules:\n- apiGroups: ["apps"]\n  resources: ["deployments"]\n  verbs: ["get","list","create","update","patch"]\n---\nkind: RoleBinding\nsubjects: [{ kind: ServiceAccount, name: ci }]\nroleRef: { name: deployer }',
    },
    responsibilities: [
      'Define fine-grained permissions on API resources',
      'Support verbs: get, list, watch, create, update, patch, delete',
      'Scope to namespace (Role) or cluster (ClusterRole)',
      'Enforced by the API Server before every request',
    ],
    deepDive: 'RBAC is enforced by the API server before any request reaches etcd. Four object kinds: Role / ClusterRole (what actions on what resources) and RoleBinding / ClusterRoleBinding (which subjects — users, groups, or ServiceAccounts — get the role). The distinction is scope: namespaced vs cluster-wide. Use the principle of least privilege: grant `get` and `list` before `*`, grant on specific resource names before wildcards, and audit with `kubectl auth can-i --list --as=<user>`.',
    docUrl: 'https://kubernetes.io/docs/reference/access-authn-authz/rbac/',
    docLabel: 'Using RBAC Authorization',
  },
  'service-account': {
    group: 'config',
    name: 'ServiceAccount',
    short: 'Identity for pods',
    color: '#ca8a04',
    tag: 'SECURITY',
    intro: 'An in-cluster identity used by pods to talk to the API Server. Each pod runs as a SA (default: "default"). Token is mounted into the pod as a file.',
    example: {
      scenario: 'A pod needs to list other pods in its namespace.',
      action: 'Create SA pod-lister, bind it to a Role with list pods, set the pod\'s serviceAccountName: pod-lister. The pod\'s client library reads /var/run/secrets/kubernetes.io/serviceaccount/token and authenticates.',
      code: '$ cat /var/run/secrets/kubernetes.io/\n  serviceaccount/token\neyJhbGciOiJSUzI1NiIsImtpZCI6...',
    },
    responsibilities: [
      'Provide an in-cluster identity for pods',
      'Issue short-lived JWT tokens (projected, auto-rotated)',
      'Back RBAC policies on workload identity',
      'Integrate with cloud IAM via IRSA / Workload Identity',
    ],
    deepDive: 'Every pod runs as a ServiceAccount (the "default" SA if you don\'t specify one). The SA is how the pod authenticates when it calls the API server or any other service that trusts cluster identities. Since Kubernetes 1.22, tokens are projected into pods as short-lived, audience-scoped JWTs that auto-rotate — far safer than the old long-lived secret tokens. Cloud providers extend this to IAM: AWS IRSA, GCP Workload Identity, and Azure AD Workload Identity all map a ServiceAccount to a cloud IAM role.',
    docUrl: 'https://kubernetes.io/docs/concepts/security/service-accounts/',
    docLabel: 'Service Accounts concept guide',
  },
  namespace: {
    group: 'config',
    name: 'Namespace',
    short: 'Virtual cluster partition',
    color: '#ca8a04',
    tag: 'ORGANIZATION',
    intro: 'A scope for names. Pods, Services, Deployments are namespaced. Namespaces also enable quotas, limits, and RBAC boundaries between teams or environments.',
    example: {
      scenario: 'Three teams share one cluster.',
      action: 'Create namespaces team-web, team-ml, team-data. Apply ResourceQuota limits (CPU: 200, memory: 400Gi) per namespace. Apply RBAC so team-web\'s SAs can only read in their own namespace. Teams cannot see each other\'s workloads.',
      code: '$ kubectl get ns\nNAME         STATUS   AGE\ndefault      Active   284d\nkube-system  Active   284d\nteam-web     Active   112d\nteam-ml      Active   98d',
    },
    responsibilities: [
      'Provide logical partitioning of cluster resources',
      'Scope names and RBAC rules',
      'Host ResourceQuotas and LimitRanges',
      'Enable NetworkPolicy boundaries',
    ],
    deepDive: 'Namespaces are the simplest multi-tenancy primitive in Kubernetes. They give you a scope for names (two Services named "api" can coexist in different namespaces), a unit for ResourceQuota and LimitRange enforcement, a target for RBAC, and a selector for NetworkPolicy. They are NOT a security boundary on their own — node-level resources (pods, volumes) live in the same kernel regardless of namespace. For hard multi-tenancy, combine namespaces with NetworkPolicies, PodSecurity, and potentially virtual clusters (vcluster, Capsule).',
    docUrl: 'https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/',
    docLabel: 'Namespaces concept guide',
  },

  // ---------- OBSERVABILITY / AUTOSCALING ----------
  hpa: {
    group: 'autoscaling',
    name: 'HorizontalPodAutoscaler (HPA)',
    short: 'Scale pods on metrics',
    color: '#be123c',
    tag: 'AUTOSCALING',
    intro: 'Automatically scales a Deployment/ReplicaSet/StatefulSet based on CPU, memory, or custom metrics. Reads metrics from metrics-server or Prometheus via the external metrics API.',
    example: {
      scenario: 'Your API has spiky traffic — 10 pods at 2 AM, needs 60 at lunchtime.',
      action: 'An HPA targets deploy/api, metric CPU 70%, range [10, 60]. Every 15s it checks: if current avg CPU is 90%, it scales up. Stabilization windows prevent flapping. Scale-up is fast, scale-down is slow.',
      code: 'kind: HorizontalPodAutoscaler\nspec:\n  scaleTargetRef: { name: api }\n  minReplicas: 10\n  maxReplicas: 60\n  metrics:\n  - type: Resource\n    resource:\n      name: cpu\n      target: { averageUtilization: 70 }',
    },
    responsibilities: [
      'Poll metrics from metrics-server or custom adapters',
      'Compute desired replicas from current vs target metric',
      'Patch the target\'s replicas field',
      'Respect min/max bounds and stabilization windows',
    ],
    deepDive: 'HPA closes the loop from metrics to replica count. It supports three metric APIs: core metrics (CPU, memory from metrics-server), custom metrics (app-level metrics from Prometheus Adapter), and external metrics (anything outside the cluster — SQS queue length, Kafka lag, Stripe events/sec). Use `behavior` to tune how aggressively HPA scales up vs down — scaling up quickly is usually safe, scaling down quickly can cause thrashing. Combine with Cluster Autoscaler for end-to-end elasticity.',
    docUrl: 'https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/',
    docLabel: 'Horizontal Pod Autoscaling',
  },
  vpa: {
    group: 'autoscaling',
    name: 'VerticalPodAutoscaler (VPA)',
    short: 'Right-size pod requests',
    color: '#be123c',
    tag: 'AUTOSCALING',
    intro: 'Adjusts CPU/memory requests & limits based on observed usage. Instead of more pods, VPA gives each pod more resources. Can be advisory (recommend only) or active (update pods).',
    example: {
      scenario: 'A Java service was over-provisioned at 4Gi but only uses 1.5Gi.',
      action: 'VPA observes 7 days of usage, recommends requests: 1.5Gi. In Auto mode, VPA evicts pods one by one and the replacements start with the new request. Saves cluster resources.',
      code: 'status:\n  recommendation:\n    containerRecommendations:\n    - containerName: api\n      target:\n        cpu: 250m\n        memory: 1500Mi',
    },
    responsibilities: [
      'Track historical resource usage',
      'Recommend better request/limit values',
      'Optionally evict & recreate pods to apply changes',
      'Not typically combined with HPA on the same metric',
    ],
    deepDive: 'VPA is an add-on (not part of core Kubernetes) that tracks container resource usage over days and recommends better requests/limits. It has three modes: `Off` (recommend only, safest), `Initial` (applies to new pods), and `Auto` (recreates running pods with new resources, disruptive). VPA conflicts with HPA on the same resource metric — use HPA for CPU scaling and VPA for memory, or use VPA purely in recommendation mode and apply suggestions through your normal deployment pipeline.',
    docUrl: 'https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler',
    docLabel: 'VPA on GitHub',
  },
  'cluster-autoscaler': {
    group: 'autoscaling',
    name: 'Cluster Autoscaler',
    short: 'Add/remove nodes automatically',
    color: '#be123c',
    tag: 'AUTOSCALING',
    intro: 'Watches for pods stuck in Pending because no node has room. Adds nodes by calling the cloud provider\'s autoscaling group. Removes underutilized nodes.',
    example: {
      scenario: 'Black Friday traffic: HPA scaled pods to 400, but the cluster only has capacity for 250.',
      action: 'Cluster Autoscaler sees 150 pending pods. It simulates scheduling and determines 12 new nodes are needed. Calls the AWS ASG API to desired: +12. New nodes join within 90s; pending pods get scheduled.',
      code: '$ kubectl logs cluster-autoscaler\nI1124 Scale-up: setting group\n  eks-workers desired size to 24\nI1124 Pod prod/api-x scheduled on\n  ip-10-0-44-12.ec2.internal',
    },
    responsibilities: [
      'Detect unschedulable pods',
      'Simulate scheduling to choose which node group to scale',
      'Call cloud provider to add/remove VMs',
      'Drain underutilized nodes safely before removal',
    ],
    deepDive: 'Cluster Autoscaler works by watching for unschedulable pods. It simulates which node group could accept them, then calls the cloud provider to resize. On scale-down, it looks for nodes that have been underutilized for 10+ minutes AND whose pods can be rescheduled elsewhere. It is cloud-provider-aware (AWS ASG, GCP MIG, Azure VMSS, etc). For faster and more flexible node provisioning, many teams are migrating to Karpenter (originally AWS-only, now multi-cloud).',
    docUrl: 'https://github.com/kubernetes/autoscaler/tree/master/cluster-autoscaler',
    docLabel: 'Cluster Autoscaler docs',
  },
  'metrics-server': {
    group: 'observability',
    name: 'metrics-server',
    short: 'In-cluster resource metrics',
    color: '#9333ea',
    tag: 'OBSERVABILITY',
    intro: 'Aggregates CPU and memory usage from every kubelet and exposes it via the Kubernetes metrics.k8s.io API. Powers kubectl top and HPA.',
    example: {
      scenario: 'You run kubectl top pods.',
      action: 'kubectl calls the metrics API. metrics-server scrapes /metrics/resource from every kubelet every 15s, aggregates, and answers. You see live CPU/memory per pod.',
      code: '$ kubectl top pods -n prod\nNAME           CPU    MEMORY\napi-7f9c-a1    245m   512Mi\napi-7f9c-b2    198m   487Mi',
    },
    responsibilities: [
      'Scrape resource metrics from kubelets',
      'Expose via the aggregation layer as metrics.k8s.io',
      'Power kubectl top and HPA core metrics',
      'Not a general-purpose monitoring system — for that, use Prometheus',
    ],
    deepDive: 'metrics-server is the minimum monitoring component a cluster needs — without it, `kubectl top` and HPA break. It is NOT a general-purpose monitoring system: it holds only the last 15 seconds of metrics in memory and does not support history, custom metrics, or alerts. For those, install Prometheus. In managed clusters (EKS, GKE, AKS) metrics-server is usually pre-installed or available as an add-on.',
    docUrl: 'https://github.com/kubernetes-sigs/metrics-server',
    docLabel: 'metrics-server on GitHub',
  },
  'admission-controller': {
    group: 'extensibility',
    name: 'Admission Controllers',
    short: 'Intercept & validate/mutate requests',
    color: '#475569',
    tag: 'EXTENSIBILITY',
    intro: 'Webhooks the API Server calls after auth but before persisting to etcd. Mutating webhooks can modify objects (inject sidecars); Validating webhooks can reject them.',
    example: {
      scenario: 'Your policy: every pod must have resource limits.',
      action: 'Deploy Kyverno/OPA Gatekeeper as a ValidatingAdmissionWebhook. Every CREATE/UPDATE pod request is sent to the webhook. If limits are missing, the webhook returns deny with a helpful message. Pod never reaches etcd.',
      code: 'Error from server: admission webhook\n"validate.kyverno.svc" denied the request:\npolicy require-limits:\n  container "api" requires resources.limits',
    },
    responsibilities: [
      'Mutate objects (Istio sidecar injection, defaults)',
      'Validate against organizational policy',
      'Block non-compliant resources before persistence',
      'Run as webhook services outside the API Server',
    ],
    deepDive: 'Admission happens after authentication + authorization but before persistence. There are two types of webhook: Mutating (runs first, can modify the object — add sidecars, set defaults, inject annotations) and Validating (runs after all mutations, can only accept or reject). Popular tools: Kyverno (policy-as-YAML, no custom language), OPA Gatekeeper (Rego-based policies), and Pod Security Admission (Kubernetes-native baselines: privileged, baseline, restricted).',
    docUrl: 'https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/',
    docLabel: 'Admission Controllers reference',
  },
  crd: {
    group: 'extensibility',
    name: 'CRD & Operators',
    short: 'Extend Kubernetes with custom APIs',
    color: '#475569',
    tag: 'EXTENSIBILITY',
    intro: 'CustomResourceDefinitions let you define new object types. An Operator is a controller that reconciles those objects — e.g. a PostgresCluster CR becomes a full HA Postgres with backups.',
    example: {
      scenario: 'You want databases as a service inside the cluster.',
      action: 'Install the CloudNativePG Operator. It registers CRDs: Cluster, Backup, ScheduledBackup. You kubectl apply a Cluster spec. The operator creates a StatefulSet, PVCs, Services, secrets, and manages failover — all from a 20-line CR.',
      code: 'apiVersion: postgresql.cnpg.io/v1\nkind: Cluster\nmetadata: { name: app-db }\nspec:\n  instances: 3\n  storage: { size: 100Gi }\n  backup:\n    barmanObjectStore: { ... }',
    },
    responsibilities: [
      'CRD: define a new API resource (schema, versions)',
      'Operator: a custom controller watching the CR',
      'Encapsulate operational knowledge as code',
      'Common examples: cert-manager, ArgoCD, Strimzi (Kafka), Prometheus Operator',
    ],
    deepDive: 'CRDs + controllers = the Operator Pattern. By defining a new object (kind: Database, kind: Cluster, kind: Certificate) and writing a controller that reconciles it, you can encode operational expertise as software. Operator SDK, Kubebuilder, and KUDO are frameworks that scaffold this for you. The Kubernetes ecosystem now has hundreds of Operators: cert-manager (TLS), ArgoCD (GitOps), Strimzi (Kafka), Crossplane (infrastructure provisioning), External Secrets, CloudNativePG, and many more.',
    docUrl: 'https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/',
    docLabel: 'Custom Resources guide',
  },
};

// ============================================================
// GROUPS for the diagram
// ============================================================
const KUBERNETES_GROUPS = [
  {
    id: 'client',
    title: 'User / Client',
    color: '#2563eb',
    colorDark: '#1e40af',
    gradient: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
    bg: '#eff6ff',
    components: ['user', 'kubectl'],
    col: 0,
  },
  {
    id: 'control-plane',
    title: 'Control Plane',
    color: '#7c3aed',
    colorDark: '#5b21b6',
    gradient: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
    bg: '#f5f3ff',
    components: ['api', 'etcd', 'scheduler', 'controller-manager', 'cloud-controller'],
    col: 1,
  },
  {
    id: 'worker-node',
    title: 'Worker Node',
    color: '#16a34a',
    colorDark: '#166534',
    gradient: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
    bg: '#f0fdf4',
    components: ['kubelet', 'kube-proxy', 'container-runtime', 'pod'],
    col: 2,
  },
];

// Map each component to its group color (for coloring the cards themselves)
const KUBERNETES_GROUP_COLOR_MAP = {
  user: '#2563eb', kubectl: '#2563eb',
  api: '#7c3aed', etcd: '#7c3aed', scheduler: '#7c3aed', 'controller-manager': '#7c3aed', 'cloud-controller': '#7c3aed',
  kubelet: '#16a34a', 'kube-proxy': '#16a34a', 'container-runtime': '#16a34a', pod: '#16a34a',
};

// Secondary sections (below main diagram)
const KUBERNETES_SECONDARY_SECTIONS = [
  { id: 'workload', title: 'Workload APIs', color: '#db2777', components: ['deployment', 'replicaset', 'statefulset', 'daemonset', 'job'] },
  { id: 'networking', title: 'Networking', color: '#0891b2', components: ['service', 'ingress', 'network-policy', 'cni', 'core-dns'] },
  { id: 'storage', title: 'Storage', color: '#0d9488', components: ['pv', 'pvc', 'storage-class', 'csi'] },
  { id: 'config', title: 'Config & Security', color: '#ca8a04', components: ['configmap', 'secret', 'rbac', 'service-account', 'namespace'] },
  { id: 'autoscaling', title: 'Autoscaling', color: '#be123c', components: ['hpa', 'vpa', 'cluster-autoscaler'] },
  { id: 'observability', title: 'Observability & Extensibility', color: '#9333ea', components: ['metrics-server', 'admission-controller', 'crd'] },
];

// Flow connections for animated lines in main diagram
const KUBERNETES_FLOWS = [
  ['user', 'kubectl'],
  ['kubectl', 'api'],
  ['api', 'etcd'],
  ['api', 'scheduler'],
  ['api', 'controller-manager'],
  ['api', 'cloud-controller'],
  ['api', 'kubelet'],
  ['kubelet', 'container-runtime'],
  ['container-runtime', 'pod'],
  ['kube-proxy', 'pod'],
];

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [activeTopic, setActiveTopic] = useState('kubernetes');
  const [selected, setSelected] = useState(null);
  const [selectedFuture, setSelectedFuture] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [search, setSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeJourney, setActiveJourney] = useState(0);
  const searchRef = useRef(null);
  const componentRefs = useRef({});
  const containerRef = useRef(null);
  const [svgDims, setSvgDims] = useState({ w: 0, h: 0 });
  const [paths, setPaths] = useState([]);
  
  // Responsive hooks
  const screen = useResponsive();
  const { isOpen: mobileMenuOpen, toggle: toggleMobileMenu } = useModal(false);

  const topic = TOPICS[activeTopic];
  const components = topic.components;
  const groups = topic.groups;
  const flows = topic.flows;
  const secondarySections = topic.secondarySections;
  const journey = topic.journey;
  const orderedIds = Object.keys(components);
  const currentIdx = selected ? orderedIds.indexOf(selected) : -1;

  const suggestions = search.trim().length > 0
    ? Object.entries(components)
        .filter(([, c]) => {
          const q = search.toLowerCase();
          return (
            c.name.toLowerCase().includes(q) ||
            c.short.toLowerCase().includes(q) ||
            c.intro.toLowerCase().includes(q) ||
            (c.tag && c.tag.toLowerCase().includes(q))
          );
        })
        .slice(0, 8)
    : [];

  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    setSelected(null);
    setSelectedFuture(null);
    setHovered(null);
    setSearch('');
    setShowSuggestions(false);
    setActiveJourney(0);
    componentRefs.current = {};
  }, [activeTopic]);

  useEffect(() => {
    if (!isPlaying) return undefined;
    const timer = window.setInterval(() => {
      setActiveJourney((current) => (current + 1) % journey.length);
    }, 2400);
    return () => window.clearInterval(timer);
  }, [isPlaying, journey.length]);

  const computePaths = () => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    setSvgDims({ w: containerRect.width, h: containerRect.height });

    const newPaths = flows.map(([fromId, toId]) => {
      const fromEl = componentRefs.current[fromId];
      const toEl = componentRefs.current[toId];
      if (!fromEl || !toEl) return null;

      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();
      const fromCenterX = fromRect.left + fromRect.width / 2;
      const toCenterX = toRect.left + toRect.width / 2;
      const leftToRight = fromCenterX < toCenterX;
      const x1 = (leftToRight ? fromRect.right : fromRect.left) - containerRect.left;
      const y1 = fromRect.top - containerRect.top + fromRect.height / 2;
      const x2 = (leftToRight ? toRect.left : toRect.right) - containerRect.left;
      const y2 = toRect.top - containerRect.top + toRect.height / 2;
      const dx = Math.abs(x2 - x1);
      const curveStrength = Math.max(60, dx * 0.55);
      const cp1x = leftToRight ? x1 + curveStrength : x1 - curveStrength;
      const cp2x = leftToRight ? x2 - curveStrength : x2 + curveStrength;
      const d = `M ${x1} ${y1} C ${cp1x} ${y1}, ${cp2x} ${y2}, ${x2} ${y2}`;
      const colorFrom = topic.groupColorMap[fromId] || components[fromId]?.color || '#64748b';
      const colorTo = topic.groupColorMap[toId] || components[toId]?.color || '#64748b';

      return { from: fromId, to: toId, d, x1, y1, x2, y2, colorFrom, colorTo };
    }).filter(Boolean);

    setPaths(newPaths);
  };

  useEffect(() => {
    computePaths();
    const ro = new ResizeObserver(computePaths);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', computePaths);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', computePaths);
    };
  }, [activeTopic]);

  const isHighlighted = (id) => {
    if (search) {
      const q = search.toLowerCase();
      const c = components[id];
      if (!c) return false;
      return (
        c.name.toLowerCase().includes(q) ||
        c.short.toLowerCase().includes(q) ||
        c.intro.toLowerCase().includes(q) ||
        (c.tag && c.tag.toLowerCase().includes(q))
      );
    }
    if (!selected && !hovered) return true;
    const active = selected || hovered;
    if (active === id) return true;
    return flows.some(([f, t]) => (f === active && t === id) || (t === active && f === id));
  };

  const isPathActive = (path) => {
    if (search) {
      return isHighlighted(path.from) && isHighlighted(path.to);
    }
    const active = selected || hovered;
    if (!active) return false;
    return path.from === active || path.to === active;
  };

  const filteredSecondary = (list) => {
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter((id) => {
      const c = components[id];
      if (!c) return false;
      return (
        c.name.toLowerCase().includes(q) ||
        c.short.toLowerCase().includes(q) ||
        c.intro.toLowerCase().includes(q) ||
        (c.tag && c.tag.toLowerCase().includes(q))
      );
    });
  };

  const liveStep = journey[activeJourney];
  const relatedSteps = [
    journey[(activeJourney - 1 + journey.length) % journey.length],
    journey[activeJourney],
    journey[(activeJourney + 1) % journey.length],
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top left, #fff6d8 0%, #f8efe0 30%, #f5efe7 60%, #eef7ff 100%)',
      position: 'relative',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');

        * { box-sizing: border-box; }
        body { margin: 0; background: #f7efe4; font-family: 'IBM Plex Sans', sans-serif; -webkit-font-smoothing: antialiased; }

        .grain::before {
          content: '';
          position: fixed; inset: 0;
          background-image: radial-gradient(circle at 1px 1px, rgba(0,0,0,0.025) 1px, transparent 0);
          background-size: 22px 22px;
          pointer-events: none;
          z-index: 0;
        }

        @keyframes flow-dash {
          to { stroke-dashoffset: -36; }
        }
        .flow-path { animation: flow-dash 1.2s linear infinite; }
        .flow-path.paused { animation-play-state: paused; }

        @keyframes pulse-dot {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.5); opacity: 0.4; }
        }

        @keyframes stagger-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .comp-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          animation: stagger-in 0.5s ease both;
        }
        .comp-card:hover {
          transform: translateY(-3px) scale(1.02);
        }
        .comp-card.dim { opacity: 0.35; filter: saturate(0.5); }

        .scrollbar-styled::-webkit-scrollbar { width: 8px; height: 8px; }
        .scrollbar-styled::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-styled::-webkit-scrollbar-thumb { background: #d6cfbe; border-radius: 4px; }
        .scrollbar-styled::-webkit-scrollbar-thumb:hover { background: #a89e85; }

        .header-shell { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
        .header-tools { display: flex; align-items: center; gap: 14px; flex: 1; justify-content: flex-end; }
        .hero-layout { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(340px, 0.85fr); gap: 26px; align-items: stretch; }
        .topic-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .diagram-grid { display: grid; grid-template-columns: 1fr 1.35fr 1fr; gap: 32px; margin-top: 30px; position: relative; z-index: 2; }
        .workflow-grid { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(330px, 0.85fr); gap: 22px; align-items: stretch; }
        .future-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
        .detail-panel { width: 480px; max-width: calc(100vw - 40px); }

        @media (max-width: 1120px) {
          .header-shell { flex-direction: column; align-items: stretch; }
          .header-tools { flex-wrap: wrap; justify-content: stretch; }
          .hero-layout, .workflow-grid, .diagram-grid { grid-template-columns: 1fr; }
          .future-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        @media (max-width: 760px) {
          header { padding: 16px 18px !important; }
          .topic-row, .future-grid { grid-template-columns: 1fr; }
          .detail-panel { width: calc(100vw - 20px); max-width: calc(100vw - 20px); }
        }
      `}</style>

      <div className="grain" style={{ position: 'relative', zIndex: 1 }}>
        <header style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          background: 'rgba(247, 239, 228, 0.86)',
          backdropFilter: 'blur(14px)',
          borderBottom: '1px solid #e8e0cc',
          padding: '16px 32px',
        }}>
          <div className="header-shell">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <AtlasMark accent={topic.accent} />
              <div>
                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  color: '#8a8270',
                  textTransform: 'uppercase',
                  marginBottom: 2,
                }}>
                  Interactive DevOps learning map
                </div>
                <div style={{
                  fontFamily: "'Instrument Serif', serif",
                  fontSize: 28,
                  letterSpacing: '-0.01em',
                  fontWeight: 400,
                }}>
                  DevOps <em style={{ color: topic.accent }}>Atlas</em>
                </div>
              </div>
            </div>

            <div className="header-tools">
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: 6,
                borderRadius: 999,
                background: 'rgba(255,255,255,0.72)',
                border: '1px solid #e8e0cc',
                boxShadow: '0 10px 22px -18px rgba(0,0,0,0.25)',
              }}>
                {Object.values(TOPICS).map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => setActiveTopic(entry.id)}
                    style={{
                      border: 'none',
                      cursor: 'pointer',
                      borderRadius: 999,
                      padding: '10px 14px',
                      background: entry.id === activeTopic ? entry.accent : 'transparent',
                      color: entry.id === activeTopic ? '#fff' : '#2a2a2a',
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 11,
                      letterSpacing: '0.06em',
                    }}
                  >
                    {entry.name}
                  </button>
                ))}
              </div>

              <div ref={searchRef} style={{ position: 'relative', width: '100%', maxWidth: 360 }}>
                <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8a8270', zIndex: 1 }} />
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={(e) => { if (e.key === 'Escape') { setShowSuggestions(false); setSearch(''); } }}
                  placeholder={activeTopic === 'docker' ? 'Search: buildkit, volume, compose...' : 'Search: ingress, hpa, csi, namespace...'}
                  autoComplete="off"
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 34px',
                    borderRadius: showSuggestions && suggestions.length > 0 ? '14px 14px 0 0' : 999,
                    border: '1px solid #e8e0cc',
                    borderBottom: showSuggestions && suggestions.length > 0 ? '1px solid #f0e8d8' : '1px solid #e8e0cc',
                    background: '#fff',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 12,
                    outline: 'none',
                    color: '#2a2a2a',
                  }}
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: '#fff',
                    border: '1px solid #e8e0cc',
                    borderTop: 'none',
                    borderRadius: '0 0 14px 14px',
                    boxShadow: '0 12px 32px -8px rgba(0,0,0,0.14)',
                    zIndex: 100,
                    overflow: 'hidden',
                  }}>
                    {suggestions.map(([id, c], idx) => (
                      <div
                        key={id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSearch('');
                          setShowSuggestions(false);
                          setSelected(id);
                          setSelectedFuture(null);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '9px 14px',
                          cursor: 'pointer',
                          borderTop: idx > 0 ? '1px solid #f5f0e8' : 'none',
                        }}
                      >
                        <span style={{
                          display: 'inline-block',
                          width: 8, height: 8,
                          borderRadius: 2,
                          background: c.color || topic.accent,
                          flexShrink: 0,
                          transform: 'rotate(45deg)',
                        }} />
                        <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: '#1a1a1a', fontWeight: 500, flex: 1 }}>
                          {c.name}
                        </span>
                        <span style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: 10,
                          color: '#8a8270',
                          letterSpacing: '0.08em',
                          background: '#f5f0e8',
                          padding: '2px 7px',
                          borderRadius: 999,
                        }}>
                          {c.tag || c.group}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px',
                  border: '1px solid #e8e0cc',
                  background: '#fff',
                  borderRadius: 999,
                  cursor: 'pointer',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  letterSpacing: '0.05em',
                  color: '#2a2a2a',
                  whiteSpace: 'nowrap',
                }}
              >
                {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                {isPlaying ? 'PAUSE FLOW' : 'PLAY FLOW'}
              </button>
            </div>
          </div>
        </header>

        <section style={{ padding: '56px 24px 18px', maxWidth: 1400, margin: '0 auto' }}>
          <div className="hero-layout">
            <div style={{ padding: '24px 8px 24px 8px', alignSelf: 'center' }}>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11,
                letterSpacing: '0.25em',
                color: '#8a8270',
                textTransform: 'uppercase',
                marginBottom: 18,
              }}>
                <span style={{
                  display: 'inline-block',
                  width: 8, height: 8,
                  background: topic.accent,
                  borderRadius: '50%',
                  marginRight: 10,
                  verticalAlign: 'middle',
                  animation: 'pulse-dot 1.8s ease-in-out infinite',
                }} />
                {topic.eyebrow}
              </div>
              <h1 style={{
                fontFamily: "'Instrument Serif', serif",
                fontSize: 'clamp(44px, 7vw, 88px)',
                lineHeight: 0.96,
                letterSpacing: '-0.03em',
                margin: '0 0 18px',
                fontWeight: 400,
                maxWidth: 820,
              }}>
                <em style={{ color: topic.accent, fontStyle: 'italic', fontWeight: 400 }}>{topic.name}</em>{' '}
                {activeTopic === 'docker' ? 'from build to runtime.' : 'architecture with the moving parts exposed.'}
              </h1>
              <p style={{
                maxWidth: 720,
                margin: '0 0 28px',
                color: '#4a4636',
                fontSize: 18,
                lineHeight: 1.6,
              }}>
                {topic.heroLead}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 22 }}>
                {topic.heroStats.map((stat) => (
                  <div
                    key={stat}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 999,
                      border: `1px solid ${topic.accent}26`,
                      background: '#fff',
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 11,
                      letterSpacing: '0.08em',
                      color: '#2a2a2a',
                    }}
                  >
                    {stat}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                {Object.values(TOPICS).map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => setActiveTopic(entry.id)}
                    style={{
                      padding: '12px 18px',
                      borderRadius: 999,
                      border: `1px solid ${entry.id === activeTopic ? entry.accent : '#e8e0cc'}`,
                      background: entry.id === activeTopic ? entry.accent : '#ffffff',
                      color: entry.id === activeTopic ? '#ffffff' : '#1a1a1a',
                      fontFamily: "'IBM Plex Sans', sans-serif",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {entry.name}
                  </button>
                ))}
              </div>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.76)',
              border: '1px solid #e8e0cc',
              borderRadius: 24,
              padding: 22,
              boxShadow: '0 38px 70px -54px rgba(0,0,0,0.35)',
              backdropFilter: 'blur(10px)',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 18,
              }}>
                <div>
                  <div style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: '#8a8270',
                    marginBottom: 5,
                  }}>
                    Topic switcher
                  </div>
                  <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 34, lineHeight: 1, fontWeight: 400 }}>
                    Start with <em style={{ color: topic.accent }}>{topic.name}</em>
                  </div>
                </div>
                <div style={{
                  padding: '8px 10px',
                  borderRadius: 14,
                  background: topic.accentSoft,
                  color: topic.accent,
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10,
                  letterSpacing: '0.12em',
                }}>
                  live now
                </div>
              </div>

              <div className="topic-row" style={{ marginBottom: 18 }}>
                {Object.values(TOPICS).map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => setActiveTopic(entry.id)}
                    style={{
                      textAlign: 'left',
                      border: `1px solid ${entry.id === activeTopic ? entry.accent : '#e8e0cc'}`,
                      background: entry.id === activeTopic ? `linear-gradient(135deg, #ffffff 0%, ${entry.accentSoft} 100%)` : '#fff',
                      borderRadius: 18,
                      padding: 18,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{
                      display: 'inline-flex',
                      padding: '4px 8px',
                      borderRadius: 999,
                      background: entry.accentSoft,
                      color: entry.accent,
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 10,
                      letterSpacing: '0.08em',
                      marginBottom: 10,
                    }}>
                      {entry.name}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>
                      {entry.short}
                    </div>
                    <div style={{ fontSize: 13, color: '#6b6552', lineHeight: 1.55 }}>
                      {entry.heroLead}
                    </div>
                  </button>
                ))}
              </div>

              <div style={{ paddingTop: 16, borderTop: '1px solid #efe6d5' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 12,
                }}>
                  <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 30, lineHeight: 1, fontWeight: 400 }}>
                    Future Topic Structure
                  </div>
                  <div style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10,
                    letterSpacing: '0.12em',
                    color: '#8a8270',
                    textTransform: 'uppercase',
                  }}>
                    click a card
                  </div>
                </div>
                <div className="future-grid">
                  {FUTURE_TOPICS.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedFuture(item)}
                      style={{
                        textAlign: 'left',
                        border: '1px solid #e8e0cc',
                        background: '#fff',
                        borderRadius: 16,
                        padding: 16,
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{
                        width: 10,
                        height: 10,
                        borderRadius: 3,
                        background: item.color,
                        transform: 'rotate(45deg)',
                        marginBottom: 10,
                      }} />
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 6 }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: 12.5, color: '#6b6552', lineHeight: 1.5 }}>
                        {item.blurb}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section style={{ maxWidth: 1400, margin: '40px auto', padding: '0 24px' }}>
          <div
            ref={containerRef}
            style={{
              position: 'relative',
              background: 'rgba(255,255,255,0.92)',
              border: '1px solid #e8e0cc',
              borderRadius: 24,
              padding: '56px 42px 42px',
              boxShadow: '0 1px 0 rgba(255,255,255,0.8) inset, 0 40px 80px -40px rgba(0,0,0,0.12), 0 12px 24px -12px rgba(0,0,0,0.06)',
              minHeight: 640,
            }}
          >
            <div style={{
              position: 'absolute', top: 20, left: 32,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10, letterSpacing: '0.18em', color: '#8a8270', textTransform: 'uppercase',
            }}>
              <span style={{ display: 'inline-block', width: 6, height: 6, background: topic.accent, borderRadius: '50%', marginRight: 8, animation: 'pulse-dot 1.5s infinite' }} />
              {topic.diagramLabel}
            </div>
            <div style={{
              position: 'absolute', top: 20, right: 32,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10, letterSpacing: '0.18em', color: '#8a8270', textTransform: 'uppercase',
            }}>
              {topic.panelHint}
            </div>

            <svg
              width={svgDims.w}
              height={svgDims.h}
              style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 1 }}
            >
              <defs>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                {paths.map((path, i) => (
                  <linearGradient key={`g-${i}`} id={`flow-grad-${i}`} gradientUnits="userSpaceOnUse" x1={path.x1} y1={path.y1} x2={path.x2} y2={path.y2}>
                    <stop offset="0%" stopColor={path.colorFrom} stopOpacity="0.9" />
                    <stop offset="100%" stopColor={path.colorTo} stopOpacity="0.9" />
                  </linearGradient>
                ))}
                {paths.map((path, i) => (
                  <marker key={`m-${i}`} id={`arrow-${i}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill={path.colorTo} />
                  </marker>
                ))}
              </defs>

              {paths.map((path, i) => {
                const active = isPathActive(path);
                const dimmed = (selected || hovered) && !active;
                return (
                  <g key={i}>
                    <path
                      d={path.d}
                      fill="none"
                      stroke={`url(#flow-grad-${i})`}
                      strokeWidth={active ? 10 : 6}
                      opacity={dimmed ? 0.03 : (active ? 0.35 : 0.18)}
                      filter="url(#glow)"
                    />
                    <path
                      d={path.d}
                      fill="none"
                      stroke={`url(#flow-grad-${i})`}
                      strokeWidth={active ? 3 : 2}
                      strokeLinecap="round"
                      opacity={dimmed ? 0.18 : 1}
                      markerEnd={`url(#arrow-${i})`}
                    />
                    <path
                      d={path.d}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth={active ? 2 : 1.2}
                      strokeDasharray="4 8"
                      strokeLinecap="round"
                      opacity={dimmed ? 0.12 : 0.75}
                      className={`flow-path ${!isPlaying ? 'paused' : ''}`}
                    />
                    {!dimmed && (
                      <circle r={active ? 4.5 : 3.5} fill={path.colorTo} filter="url(#glow)">
                        <animateMotion dur={active ? '1.6s' : '2.4s'} repeatCount="indefinite" path={path.d} rotate="auto" />
                      </circle>
                    )}
                    {active && (
                      <circle r="2.5" fill="#ffffff" opacity="0.9">
                        <animateMotion dur="1.6s" repeatCount="indefinite" path={path.d} begin="0.3s" />
                      </circle>
                    )}
                  </g>
                );
              })}
            </svg>

            <div className="diagram-grid">
              {groups.map((group, gi) => (
                <div
                  key={group.id}
                  style={{
                    border: `2px solid ${group.color}30`,
                    borderRadius: 18,
                    padding: '28px 16px 18px',
                    position: 'relative',
                    background: group.gradient,
                    boxShadow: `0 8px 28px -12px ${group.color}35, inset 0 1px 0 rgba(255,255,255,0.6)`,
                    animation: `stagger-in 0.6s ease ${gi * 0.1}s both`,
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: -13, left: 18,
                    background: group.color,
                    padding: '5px 14px',
                    borderRadius: 999,
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
                    color: '#fff', fontWeight: 600,
                    boxShadow: `0 4px 12px -2px ${group.color}80`,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', animation: 'pulse-dot 1.8s infinite' }} />
                    {group.title}
                  </div>
                  <div style={{
                    position: 'absolute',
                    top: -10, right: 16,
                    background: '#fff',
                    border: `1.5px solid ${group.color}`,
                    padding: '2px 10px',
                    borderRadius: 999,
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10,
                    color: group.color,
                    fontWeight: 600,
                  }}>
                    {group.components.length} components
                  </div>

                  {group.components.map((id, ci) => (
                    <ComponentCard
                      key={id}
                      id={id}
                      data={components[id]}
                      groupColor={group.color}
                      groupColorDark={group.colorDark}
                      onClick={() => {
                        setSelected(id);
                        setSelectedFuture(null);
                      }}
                      onHover={() => setHovered(id)}
                      onLeave={() => setHovered(null)}
                      active={selected === id}
                      dim={!isHighlighted(id)}
                      refCallback={(el) => { componentRefs.current[id] = el; }}
                      delay={gi * 0.1 + ci * 0.06}
                      showMiniPods={id === 'pod'}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ maxWidth: 1400, margin: '80px auto 40px', padding: '0 24px' }}>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{
              fontFamily: "'Instrument Serif', serif",
              fontSize: 48,
              letterSpacing: '-0.02em',
              fontWeight: 400,
              lineHeight: 1.05,
              margin: 0,
            }}>
              {topic.sectionsTitle} <em style={{ color: topic.accent, fontStyle: 'italic' }}>in context</em>
            </h2>
            <p style={{ color: '#6b6552', fontSize: 17, marginTop: 12, maxWidth: 760 }}>
              {topic.sectionsLead}
            </p>
          </div>

          {secondarySections.map((sec, si) => {
            const filtered = filteredSecondary(sec.components);
            if (search && filtered.length === 0) return null;
            return (
              <div key={sec.id} style={{ marginBottom: 56 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 14,
                  marginBottom: 18,
                  paddingBottom: 12,
                  borderBottom: `1px solid ${sec.color}33`,
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: sec.color, transform: 'rotate(45deg)' }} />
                  <h3 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 30, letterSpacing: '-0.01em', fontWeight: 400, margin: 0 }}>
                    {sec.title}
                  </h3>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#8a8270', letterSpacing: '0.12em' }}>
                    {filtered.length} components
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
                  {filtered.map((id, ci) => (
                    <SecondaryCard
                      key={id}
                      id={id}
                      data={components[id]}
                      accent={sec.color}
                      onClick={() => {
                        setSelected(id);
                        setSelectedFuture(null);
                      }}
                      delay={si * 0.05 + ci * 0.03}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {search && suggestions.length === 0 && (
            <div style={{
              border: '1px dashed #d6cfbe',
              borderRadius: 18,
              padding: 22,
              background: 'rgba(255,255,255,0.64)',
              color: '#6b6552',
              fontSize: 15,
            }}>
              {topic.emptySearch}
            </div>
          )}
        </section>

        <section style={{ maxWidth: 1400, margin: '80px auto 40px', padding: '0 24px' }}>
          <h2 style={{
            fontFamily: "'Instrument Serif', serif",
            fontSize: 48,
            letterSpacing: '-0.02em',
            fontWeight: 400,
            lineHeight: 1.05,
            margin: '0 0 12px',
          }}>
            {topic.workflowTitle}
          </h2>
          <p style={{ color: '#6b6552', fontSize: 17, marginBottom: 36, maxWidth: 680 }}>
            {topic.workflowLead}
          </p>

          <div className="workflow-grid">
            <div style={{
              background: 'rgba(255,255,255,0.82)',
              border: '1px solid #e8e0cc',
              borderRadius: 24,
              padding: 20,
              boxShadow: '0 30px 60px -48px rgba(0,0,0,0.34)',
            }}>
              <div className="scrollbar-styled" style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 10, scrollSnapType: 'x mandatory' }}>
                {journey.map((step, i) => {
                  const isActive = i === activeJourney;
                  return (
                    <motion.button
                      key={step.title}
                      initial={{ opacity: 0, y: 18 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ duration: 0.45, delay: i * 0.03 }}
                      onClick={() => setActiveJourney(i)}
                      style={{
                        minWidth: 250,
                        textAlign: 'left',
                        background: isActive ? `linear-gradient(160deg, ${topic.accent} 0%, #101828 160%)` : '#fff',
                        color: isActive ? '#fff' : '#1a1a1a',
                        border: `1px solid ${isActive ? topic.accent : '#e8e0cc'}`,
                        borderRadius: 18,
                        padding: 20,
                        scrollSnapAlign: 'start',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{
                        fontFamily: "'Instrument Serif', serif",
                        fontSize: 44,
                        fontStyle: 'italic',
                        color: isActive ? 'rgba(255,255,255,0.28)' : '#d6cfbe',
                        lineHeight: 1,
                        fontWeight: 400,
                      }}>
                        {String(i + 1).padStart(2, '0')}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, marginTop: 8, marginBottom: 6 }}>
                        {step.title}
                      </div>
                      <div style={{ fontSize: 12.5, color: isActive ? 'rgba(255,255,255,0.82)' : '#6b6552', lineHeight: 1.55 }}>
                        {step.desc}
                      </div>
                      <div style={{
                        marginTop: 14,
                        padding: '4px 8px',
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 10,
                        background: isActive ? 'rgba(255,255,255,0.14)' : '#1a1a1a',
                        color: '#fbf8f1',
                        display: 'inline-block',
                        borderRadius: 999,
                        letterSpacing: '0.04em',
                      }}>
                        {step.actor}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <div style={{
              position: 'relative',
              borderRadius: 24,
              overflow: 'hidden',
              background: '#0f172a',
              color: '#f8fafc',
              border: `1px solid ${topic.accent}55`,
              boxShadow: `0 30px 60px -44px ${topic.accent}`,
            }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                background: `radial-gradient(circle at top right, ${topic.accent}33 0%, transparent 38%)`,
                pointerEvents: 'none',
              }} />
              <div style={{ padding: 20, borderBottom: '1px solid rgba(255,255,255,0.08)', position: 'relative' }}>
                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: '#93c5fd',
                  marginBottom: 8,
                }}>
                  {topic.workflowRealtimeLabel}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                  <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 34, lineHeight: 1, fontWeight: 400 }}>
                    {liveStep.title}
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#cbd5e1' }}>
                    {String(activeJourney + 1).padStart(2, '0')} / {journey.length}
                  </div>
                </div>
                <div style={{ width: '100%', height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 14 }}>
                  <motion.div
                    key={`${activeTopic}-${activeJourney}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${((activeJourney + 1) / journey.length) * 100}%` }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    style={{ height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${topic.accent}, #f8fafc)` }}
                  />
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.6, color: '#dbe5f2' }}>
                  {liveStep.desc}
                </div>
              </div>

              <div style={{ padding: 20, position: 'relative' }}>
                <div style={{
                  padding: '12px 14px',
                  borderRadius: 14,
                  background: 'rgba(2,6,23,0.88)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  color: '#86efac',
                  marginBottom: 16,
                  lineHeight: 1.7,
                }}>
                  $ {topic.workflowCommand}
                </div>

                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10,
                  letterSpacing: '0.16em',
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  marginBottom: 10,
                }}>
                  Runtime feed
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {relatedSteps.map((step, idx) => {
                    const isCurrent = step.title === liveStep.title;
                    return (
                      <div
                        key={`${step.title}-${idx}`}
                        style={{
                          borderRadius: 14,
                          padding: '12px 14px',
                          background: isCurrent ? 'rgba(14,165,233,0.18)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${isCurrent ? `${topic.accent}88` : 'rgba(255,255,255,0.06)'}`,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 5 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc' }}>
                            {step.title}
                          </div>
                          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: isCurrent ? '#7dd3fc' : '#94a3b8' }}>
                            {isCurrent ? 'active' : 'queued'}
                          </div>
                        </div>
                        <div style={{ fontSize: 12.5, lineHeight: 1.55, color: '#cbd5e1' }}>
                          {step.desc}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section style={{ maxWidth: 1020, margin: '80px auto', padding: '0 24px' }}>
          <h2 style={{
            fontFamily: "'Instrument Serif', serif",
            fontSize: 42,
            letterSpacing: '-0.02em',
            fontWeight: 400,
            margin: '0 0 20px',
          }}>
            {topic.compareTitle}
          </h2>
          {topic.compareParagraphs.map((paragraph) => (
            <p key={paragraph} style={{ fontSize: 17, color: '#3a3628', lineHeight: 1.7, marginBottom: 16 }}>
              {paragraph}
            </p>
          ))}
        </section>

        <section style={{ maxWidth: 1400, margin: '40px auto 80px', padding: '0 24px' }}>
          <div style={{ background: 'rgba(255,255,255,0.78)', border: '1px solid #e8e0cc', borderRadius: 24, padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
              <div>
                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: '#8a8270',
                  marginBottom: 5,
                }}>
                  Roadmap
                </div>
                <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 38, lineHeight: 1, fontWeight: 400 }}>
                  Future Topic Structure
                </div>
              </div>
              <div style={{ fontSize: 14, color: '#6b6552', maxWidth: 500 }}>
                Each upcoming topic will open with the same interactive architecture, examples, workflow trace, and troubleshooting surface.
              </div>
            </div>
            <div className="future-grid">
              {FUTURE_TOPICS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedFuture(item)}
                  style={{
                    textAlign: 'left',
                    background: '#fff',
                    border: '1px solid #e8e0cc',
                    borderRadius: 18,
                    padding: 18,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10,
                    color: item.color,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    marginBottom: 10,
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: item.color, transform: 'rotate(45deg)' }} />
                    Coming soon
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: '#1a1a1a' }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.55, color: '#6b6552' }}>
                    {item.blurb}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <footer style={{
          padding: '48px 32px 40px',
          textAlign: 'center',
          borderTop: '1px solid #e8e0cc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 18,
        }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#8a8270', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            Built by
          </div>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 28, fontWeight: 400, letterSpacing: '-0.01em', color: '#1a1a1a' }}>
            Anas <em style={{ fontStyle: 'italic', color: topic.accent }}>Kadambalath</em>
          </div>

          <div style={{ display: 'flex', gap: 14, marginTop: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
            <a href="https://github.com/anaskmh" target="_blank" rel="noopener noreferrer" aria-label="GitHub" title="GitHub · anaskmh" style={socialLinkStyle('#1a1a1a')} onMouseEnter={(e) => hoverIn(e, '#1a1a1a')} onMouseLeave={(e) => hoverOut(e, '#1a1a1a')}>
              <Github size={18} />
              <span style={socialLabelStyle}>GitHub</span>
            </a>
            <a href="https://www.linkedin.com/in/anaskadambalath/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" title="LinkedIn · Anas Kadambalath" style={socialLinkStyle('#0a66c2')} onMouseEnter={(e) => hoverIn(e, '#0a66c2')} onMouseLeave={(e) => hoverOut(e, '#0a66c2')}>
              <Linkedin size={18} />
              <span style={socialLabelStyle}>LinkedIn</span>
            </a>
            <a href="https://medium.com/@anaskmh" target="_blank" rel="noopener noreferrer" aria-label="Medium" title="Medium · @anaskmh" style={socialLinkStyle('#000000')} onMouseEnter={(e) => hoverIn(e, '#000000')} onMouseLeave={(e) => hoverOut(e, '#000000')}>
              <MediumIcon size={18} />
              <span style={socialLabelStyle}>Medium</span>
            </a>
          </div>

          <VisitorCounter />

          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#b0a892', letterSpacing: '0.16em', marginTop: 6 }}>
            {topic.footerTicker}
          </div>
        </footer>
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ x: 520, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 520, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            style={{
              position: 'fixed',
              top: 80,
              right: 20,
              bottom: 20,
              background: '#fbf8f1',
              border: '1.5px solid #1a1a1a',
              borderRadius: 18,
              boxShadow: '10px 12px 0 #1a1a1a, 0 30px 80px -20px rgba(0,0,0,0.35)',
              zIndex: 60,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            className="detail-panel"
          >
            <DetailPanel
              id={selected}
              data={components[selected]}
              onClose={() => setSelected(null)}
              onPrev={() => {
                if (currentIdx > 0) setSelected(orderedIds[currentIdx - 1]);
              }}
              onNext={() => {
                if (currentIdx < orderedIds.length - 1) setSelected(orderedIds[currentIdx + 1]);
              }}
              index={currentIdx + 1}
              total={orderedIds.length}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedFuture && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.22 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.42)',
              zIndex: 70,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
            onClick={() => setSelectedFuture(null)}
          >
            <motion.div
              initial={{ scale: 0.97 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.97 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 'min(560px, 100%)',
                background: '#fbf8f1',
                border: '1.5px solid #1a1a1a',
                borderRadius: 22,
                boxShadow: '0 40px 80px -44px rgba(0,0,0,0.45)',
                overflow: 'hidden',
              }}
            >
              <ComingSoonPanel item={selectedFuture} copy={topic.comingSoonCopy} onClose={() => setSelectedFuture(null)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// ATLAS MARK
// ============================================================
function AtlasMark({ accent = '#326ce5' }) {
  return (
    <svg width="36" height="36" viewBox="0 0 100 100" fill="none" aria-label="DevOps Atlas logo">
      <rect x="10" y="10" width="80" height="80" rx="24" fill={accent} />
      <path d="M26 62L50 26L74 62" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M34 62H66" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
      <circle cx="50" cy="50" r="8" fill="#fff" />
      <g opacity="0.18">
        <circle cx="50" cy="50" r="28" stroke="#fff" strokeWidth="4" />
        <circle cx="50" cy="50" r="38" stroke="#fff" strokeWidth="3" />
      </g>
    </svg>
  );
}

// ============================================================
// COMPONENT CARD (main diagram)
// ============================================================
function ComponentCard({ id, data, onClick, onHover, onLeave, active, dim, refCallback, delay, showMiniPods, groupColor, groupColorDark }) {
  const accent = groupColor || data.color;
  const accentDark = groupColorDark || data.color;
  return (
    <div
      ref={refCallback}
      className={`comp-card ${dim ? 'dim' : ''}`}
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      style={{
        background: active
          ? `linear-gradient(135deg, #ffffff 0%, ${accent}15 100%)`
          : '#ffffff',
        border: `2px solid ${active ? accent : accent + '40'}`,
        borderRadius: 12,
        padding: '13px 14px',
        margin: '10px 0',
        cursor: 'pointer',
        position: 'relative',
        boxShadow: active
          ? `0 0 0 4px ${accent}25, 0 8px 20px -6px ${accent}50`
          : `0 2px 6px -2px ${accent}20`,
        animationDelay: `${delay}s`,
      }}
    >
      {/* Left color bar */}
      <div style={{
        position: 'absolute',
        left: 0, top: 10, bottom: 10,
        width: 3, borderRadius: 2,
        background: `linear-gradient(to bottom, ${accent}, ${accentDark})`,
      }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingLeft: 6 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: accentDark }}>{data.name}</div>
        <div style={{
          width: 24, height: 24, borderRadius: 6,
          background: `linear-gradient(135deg, ${accent}, ${accentDark})`,
          color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 700,
          boxShadow: `0 2px 6px -1px ${accent}60`,
        }}>
          {initialsOf(data.name)}
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: '#6b6552', marginTop: 3, fontFamily: "'IBM Plex Mono', monospace", paddingLeft: 6 }}>
        {data.short}
      </div>

      {showMiniPods && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 10, paddingLeft: 6 }}>
          {['web-a7f3', 'api-b2c1'].map((name) => (
            <div key={name} style={{
              background: 'linear-gradient(135deg, #fff5ed, #ffe4d0)',
              border: '1.5px solid #ea580c',
              borderRadius: 7,
              padding: 6,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9,
              position: 'relative',
              textAlign: 'center',
            }}>
              <div style={{
                position: 'absolute', top: 3, left: 3,
                width: 5, height: 5, borderRadius: '50%',
                background: '#16a34a',
                boxShadow: '0 0 5px #16a34a',
              }} />
              <div style={{ fontWeight: 700, color: '#ea580c' }}>{name}</div>
              <div style={{ color: '#6b6552', fontSize: 8 }}>nginx:1.25</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// SECONDARY CARD (for additional sections)
// ============================================================
function SecondaryCard({ id, data, accent, onClick, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay }}
      whileHover={{ y: -4, boxShadow: `4px 6px 0 ${accent}` }}
      onClick={onClick}
      style={{
        background: '#fff',
        border: '1px solid #e8e0cc',
        borderRadius: 12,
        padding: 16,
        cursor: 'pointer',
        transition: 'border-color 0.2s',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6,
          background: accent, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 700,
        }}>
          {initialsOf(data.name)}
        </div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{data.name}</div>
      </div>
      <div style={{ fontSize: 12, color: '#6b6552', lineHeight: 1.45, fontFamily: "'IBM Plex Mono', monospace" }}>
        {data.short}
      </div>
    </motion.div>
  );
}

// ============================================================
// COMING SOON PANEL
// ============================================================
function ComingSoonPanel({ item, copy, onClose }) {
  return (
    <>
      <div style={{
        padding: '20px 22px 16px',
        borderBottom: '1px solid #e8e0cc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}>
        <div>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: item.color,
            marginBottom: 4,
          }}>
            Stay tuned
          </div>
          <div style={{
            fontFamily: "'Instrument Serif', serif",
            fontSize: 34,
            lineHeight: 1,
            fontWeight: 400,
          }}>
            {item.title}
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'transparent',
          border: '1px solid #d6cfbe',
          width: 30,
          height: 30,
          borderRadius: 7,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6b6552',
        }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ padding: 22 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 10px',
          borderRadius: 999,
          background: `${item.color}14`,
          color: item.color,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: 16,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: item.color, transform: 'rotate(45deg)' }} />
          Coming soon
        </div>
        <p style={{ fontSize: 15, color: '#3a3628', lineHeight: 1.65, margin: '0 0 16px' }}>
          {copy}
        </p>
        <div style={{
          border: '1px dashed #d6cfbe',
          borderRadius: 16,
          padding: 16,
          background: '#fff',
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>
            Planned scope
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#6b6552' }}>
            {item.blurb}
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================
// DETAIL PANEL
// ============================================================
function DetailPanel({ id, data, onClose, onPrev, onNext, index, total }) {
  return (
    <>
      <div style={{
        padding: '18px 22px 14px',
        borderBottom: '1px solid #e8e0cc',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 7,
            background: data.color, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 700,
          }}>
            {initialsOf(data.name)}
          </div>
          <div>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9,
              letterSpacing: '0.14em',
              color: data.color,
              fontWeight: 600,
              marginBottom: 2,
            }}>
              {data.tag}
            </div>
            <div style={{
              fontFamily: "'Instrument Serif', serif",
              fontSize: 24,
              fontWeight: 400,
              letterSpacing: '-0.01em',
              lineHeight: 1.1,
            }}>
              {data.name}
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'transparent',
          border: '1px solid #d6cfbe',
          width: 30, height: 30,
          borderRadius: 7,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#6b6552',
        }}>
          <X size={16} />
        </button>
      </div>

      <div className="scrollbar-styled" style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>
        <p style={{ fontSize: 14, color: '#3a3628', lineHeight: 1.6, margin: '0 0 20px' }}>
          {data.intro}
        </p>

        {/* REAL EXAMPLE BLOCK */}
        <div style={{
          background: '#1a1a1a',
          border: `1.5px solid ${data.color}`,
          borderRadius: 10,
          padding: '14px 16px',
          marginBottom: 18,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 10, right: 12,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9, letterSpacing: '0.16em',
            color: data.color, fontWeight: 600,
          }}>
            REAL EXAMPLE
          </div>
          <div style={{
            fontSize: 12,
            color: '#a89e85',
            fontFamily: "'IBM Plex Mono', monospace",
            marginBottom: 6,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            Scenario
          </div>
          <div style={{ fontSize: 13, color: '#fbf8f1', lineHeight: 1.55, marginBottom: 14 }}>
            {data.example.scenario}
          </div>

          <div style={{
            fontSize: 12,
            color: '#a89e85',
            fontFamily: "'IBM Plex Mono', monospace",
            marginBottom: 6,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            What happens
          </div>
          <div style={{ fontSize: 13, color: '#fbf8f1', lineHeight: 1.55, marginBottom: 14 }}>
            {data.example.action}
          </div>

          <pre style={{
            background: '#0a0a0a',
            border: '1px solid #2a2a2a',
            borderRadius: 6,
            padding: '10px 12px',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            color: '#a8e063',
            overflow: 'auto',
            lineHeight: 1.55,
            margin: 0,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {data.example.code}
          </pre>
        </div>

        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10,
          letterSpacing: '0.16em',
          color: '#8a8270',
          textTransform: 'uppercase',
          marginBottom: 10,
        }}>
          Key responsibilities
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {data.responsibilities.map((r, i) => (
            <li key={i} style={{
              position: 'relative',
              padding: '7px 0 7px 20px',
              fontSize: 13,
              color: '#3a3628',
              borderBottom: i < data.responsibilities.length - 1 ? '1px dashed #e8e0cc' : 'none',
              lineHeight: 1.5,
            }}>
              <span style={{
                position: 'absolute', left: 0, top: 7,
                color: data.color, fontWeight: 700,
              }}>→</span>
              {r}
            </li>
          ))}
        </ul>

        {/* DEEP DIVE PARAGRAPH */}
        {data.deepDive && (
          <>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              letterSpacing: '0.16em',
              color: '#8a8270',
              textTransform: 'uppercase',
              margin: '24px 0 10px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <BookOpen size={12} />
              Deeper dive
            </div>
            <p style={{
              fontSize: 13.5,
              color: '#3a3628',
              lineHeight: 1.7,
              margin: '0 0 18px',
              padding: '14px 16px',
              background: `linear-gradient(135deg, ${data.color}08 0%, ${data.color}04 100%)`,
              borderLeft: `3px solid ${data.color}`,
              borderRadius: '0 8px 8px 0',
            }}>
              {data.deepDive}
            </p>
          </>
        )}

        {data.troubleshooting && (
          <>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              letterSpacing: '0.16em',
              color: '#8a8270',
              textTransform: 'uppercase',
              margin: '24px 0 10px',
            }}>
              Real-time troubleshooting
            </div>
            <div style={{
              background: '#fff',
              border: `1px solid ${data.color}30`,
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 12, color: '#8a8270', fontFamily: "'IBM Plex Mono', monospace", marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Symptom
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#1f2937', marginBottom: 14 }}>
                {data.troubleshooting.symptom}
              </div>

              <div style={{ fontSize: 12, color: '#8a8270', fontFamily: "'IBM Plex Mono', monospace", marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Checks
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 14px' }}>
                {data.troubleshooting.checks.map((check) => (
                  <li key={check} style={{ position: 'relative', padding: '0 0 8px 18px', fontSize: 13, color: '#3a3628', lineHeight: 1.5 }}>
                    <span style={{ position: 'absolute', left: 0, top: 0, color: data.color, fontWeight: 700 }}>•</span>
                    {check}
                  </li>
                ))}
              </ul>

              <div style={{ fontSize: 12, color: '#8a8270', fontFamily: "'IBM Plex Mono', monospace", marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Fix
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#1f2937', marginBottom: 14 }}>
                {data.troubleshooting.fix}
              </div>

              <pre style={{
                background: '#0a0a0a',
                border: '1px solid #2a2a2a',
                borderRadius: 6,
                padding: '10px 12px',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11,
                color: '#93c5fd',
                overflow: 'auto',
                lineHeight: 1.55,
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {data.troubleshooting.code}
              </pre>
            </div>
          </>
        )}

        {data.docUrl && (
          <a
            href={data.docUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              padding: '14px 16px',
              marginTop: 4,
              background: data.color,
              color: '#ffffff',
              borderRadius: 10,
              textDecoration: 'none',
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              boxShadow: `0 6px 14px -4px ${data.color}70`,
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = `0 10px 20px -4px ${data.color}90`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = `0 6px 14px -4px ${data.color}70`;
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 9,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                opacity: 0.85,
              }}>
                Read the official docs
              </span>
              <span>{data.docLabel || 'Learn more in the official docs'}</span>
            </div>
            <ExternalLink size={16} style={{ flexShrink: 0 }} />
          </a>
        )}
      </div>

      <div style={{
        padding: '12px 22px',
        borderTop: '1px solid #e8e0cc',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 11,
        color: '#8a8270',
      }}>
        <button
          onClick={onPrev}
          disabled={index <= 1}
          style={{
            background: 'transparent', border: 'none', cursor: index <= 1 ? 'not-allowed' : 'pointer',
            color: index <= 1 ? '#c8bfa8' : '#1a1a1a',
            fontFamily: 'inherit', fontSize: 11,
            padding: '5px 10px', borderRadius: 6,
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <ChevronLeft size={12} /> prev
        </button>
        <span>{index} / {total}</span>
        <button
          onClick={onNext}
          disabled={index >= total}
          style={{
            background: 'transparent', border: 'none', cursor: index >= total ? 'not-allowed' : 'pointer',
            color: index >= total ? '#c8bfa8' : '#1a1a1a',
            fontFamily: 'inherit', fontSize: 11,
            padding: '5px 10px', borderRadius: 6,
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          next <ChevronRight size={12} />
        </button>
      </div>
    </>
  );
}

// ============================================================
// HELPERS
// ============================================================
function initialsOf(name) {
  return name.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase();
}

// ============================================================
// VISITOR COUNTER
// ============================================================
const VISITOR_BASE = 4341;
const VISITOR_COUNTER_KEY = 'devops-atlas/visitors';

function VisitorCounter() {
  const [count, setCount] = useState(null);
  const [animCount, setAnimCount] = useState(VISITOR_BASE);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    // hit countapi — increments on every real page load for the DevOps Atlas counter
    fetch(`https://api.countapi.xyz/hit/${VISITOR_COUNTER_KEY}`)
      .then((r) => r.json())
      .then((data) => {
        const real = data.value || 0;
        const display = VISITOR_BASE + real;
        setCount(display);

        // Animate the number scrolling up
        const start = VISITOR_BASE;
        const diff = display - start;
        const duration = 1400;
        const startTime = performance.now();

        const step = (now) => {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          // ease-out cubic
          const eased = 1 - Math.pow(1 - progress, 3);
          setAnimCount(Math.floor(start + diff * eased));
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      })
      .catch(() => {
        // API unavailable — show base count
        setCount(VISITOR_BASE);
        setAnimCount(VISITOR_BASE);
      });
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      padding: '18px 32px',
      borderRadius: 16,
      border: '1px solid #e8e0cc',
      background: 'linear-gradient(135deg, #fff 0%, #f9f5ee 100%)',
      boxShadow: '0 4px 16px -6px rgba(50,108,229,0.10)',
      minWidth: 180,
    }}>
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 9,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        color: '#8a8270',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <span style={{
          display: 'inline-block',
          width: 6, height: 6,
          borderRadius: '50%',
          background: '#16a34a',
          animation: 'pulse-dot 1.6s ease-in-out infinite',
        }} />
        Total Visitors
      </div>
      <div style={{
        fontFamily: "'Instrument Serif', serif",
        fontSize: 36,
        fontWeight: 400,
        letterSpacing: '-0.03em',
        color: '#326ce5',
        lineHeight: 1,
        minWidth: 100,
        textAlign: 'center',
        transition: 'color 0.3s',
      }}>
        {count === null ? '—' : animCount.toLocaleString()}
      </div>
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 9,
        color: '#b0a892',
        letterSpacing: '0.10em',
      }}>
        and counting
      </div>
    </div>
  );
}

// ----- Social footer helpers -----
const socialLinkStyle = (accent) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 16px',
  borderRadius: 999,
  border: `1.5px solid ${accent}30`,
  background: '#ffffff',
  color: accent,
  textDecoration: 'none',
  fontFamily: "'IBM Plex Sans', sans-serif",
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: '0.02em',
  transition: 'all 0.25s cubic-bezier(.2,.8,.2,1)',
  cursor: 'pointer',
  boxShadow: `0 2px 6px -2px ${accent}20`,
});

const socialLabelStyle = {
  fontFamily: "'IBM Plex Sans', sans-serif",
};

function hoverIn(e, accent) {
  const el = e.currentTarget;
  el.style.background = accent;
  el.style.color = '#ffffff';
  el.style.borderColor = accent;
  el.style.transform = 'translateY(-3px)';
  el.style.boxShadow = `0 8px 18px -4px ${accent}70`;
}

function hoverOut(e, accent) {
  const el = e.currentTarget;
  el.style.background = '#ffffff';
  el.style.color = accent;
  el.style.borderColor = `${accent}30`;
  el.style.transform = 'translateY(0)';
  el.style.boxShadow = `0 2px 6px -2px ${accent}20`;
}

// Custom Medium "M" icon (not included in lucide-react)
function MediumIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.54 12c0 3.04-2.45 5.5-5.47 5.5S2.6 15.04 2.6 12 5.05 6.5 8.07 6.5s5.47 2.46 5.47 5.5zm5.99 0c0 2.86-1.22 5.18-2.73 5.18s-2.74-2.32-2.74-5.18 1.23-5.18 2.74-5.18S19.53 9.14 19.53 12zM22 12c0 2.56-.43 4.64-.96 4.64s-.96-2.08-.96-4.64.43-4.64.96-4.64.96 2.08.96 4.64z" />
    </svg>
  );
}

// ============================================================
// JOURNEY STEPS
// ============================================================
const KUBERNETES_JOURNEY = [
  { title: 'You run kubectl apply', desc: 'A developer runs kubectl apply -f checkout-v2.yaml from their laptop.', actor: 'kubectl' },
  { title: 'HTTPS POST to API Server', desc: 'kubectl reads kubeconfig, finds cluster URL, sends auth\'d HTTPS POST on :6443.', actor: 'API Server' },
  { title: 'Auth → RBAC → admission', desc: 'Request passes authentication, RBAC checks, and all admission webhooks.', actor: 'API Server' },
  { title: 'Persist to etcd', desc: 'Deployment object is serialized and written via Raft consensus to etcd.', actor: 'etcd' },
  { title: 'Controller reconciles', desc: 'Deployment controller sees the new object, creates a ReplicaSet.', actor: 'Controller' },
  { title: 'ReplicaSet creates pods', desc: 'ReplicaSet controller creates 5 Pod objects with nodeName empty.', actor: 'Controller' },
  { title: 'Scheduler assigns nodes', desc: 'Scheduler filters & scores nodes, binds each pod to a specific worker.', actor: 'Scheduler' },
  { title: 'kubelet picks up pods', desc: 'Target node\'s kubelet sees pods assigned to it via watch.', actor: 'kubelet' },
  { title: 'Runtime pulls image', desc: 'containerd pulls nginx:1.25 from the registry, creates namespaces & cgroups.', actor: 'Runtime' },
  { title: 'Container starts', desc: 'Runtime exec\'s the container process as PID 1 in the pod namespace.', actor: 'Runtime' },
  { title: 'kube-proxy wires Service', desc: 'EndpointSlice updated; iptables/IPVS rules route Service IP to new pods.', actor: 'kube-proxy' },
  { title: 'Status reported back', desc: 'kubelet reports Running to API Server. kubectl get pods shows Running.', actor: 'kubelet' },
];

const DOCKER_COMPONENTS = {
  'docker-user': {
    group: 'workspace',
    name: 'Developer Workspace',
    short: 'Laptop, shell, source code, and local feedback loop',
    color: '#0f172a',
    tag: 'WORKSPACE',
    intro: 'Docker starts on the developer machine. Source code, a terminal, a Dockerfile, and a fast local loop are the raw materials for everything that follows.',
    example: {
      scenario: 'A backend developer is fixing a Node.js API bug before pushing to staging.',
      action: 'They edit code locally, rebuild the image, run it in a container, and validate the fix before pushing anything upstream.',
      code: '$ npm test\n$ docker build -t atlas-api:dev .\n$ docker run --rm -p 8080:8080 atlas-api:dev',
    },
    responsibilities: [
      'Own the source tree, Dockerfile, and local configuration',
      'Trigger image builds and container runs',
      'Validate behavior before publishing to a registry',
    ],
    deepDive: 'The Docker story starts before the daemon. A poor local workflow makes every later environment worse. Fast feedback depends on deterministic builds, clear tags, a predictable Dockerfile, and small images that can rebuild quickly.',
    docUrl: 'https://docs.docker.com/get-started/',
    docLabel: 'Docker getting started',
    troubleshooting: {
      symptom: 'The app works on the host machine but behaves differently in the container.',
      checks: [
        'Confirm the container is using the same environment variables and ports you expect.',
        'Inspect the working directory, copied files, and installed dependencies inside the image.',
      ],
      fix: 'Run the same command inside the container, not on the host, and compare filesystem paths, users, and environment values.',
      code: '$ docker run --rm -it atlas-api:dev sh\n# env | sort\n# ls -la /app',
    },
  },
  'docker-cli': {
    group: 'workspace',
    name: 'Docker CLI',
    short: 'User-facing command surface for Docker',
    color: '#1d4ed8',
    tag: 'CLI',
    intro: 'The Docker CLI turns commands like build, run, logs, and push into API calls to the Docker Engine.',
    example: {
      scenario: 'You need to rebuild a Python worker image and stream the output live.',
      action: 'The CLI sends the build context to the engine, streams BuildKit progress, and prints the resulting image digest once the build completes.',
      code: '$ docker build -t payments-worker:1.4 .\n[+] Building 19.6s (14/14) FINISHED\n=> exporting to image\n=> => naming to docker.io/library/payments-worker:1.4',
    },
    responsibilities: [
      'Accept build, run, inspect, push, and logs commands',
      'Forward requests to the engine API',
      'Stream progress, status, logs, and errors back to the terminal',
    ],
    deepDive: 'The Docker CLI is not the runtime. It is a client. Most commands simply format a request, send it to the Docker API socket, then render the response in a human-friendly form.',
    docUrl: 'https://docs.docker.com/reference/cli/docker/',
    docLabel: 'Docker CLI reference',
    troubleshooting: {
      symptom: 'Docker commands hang or return "Cannot connect to the Docker daemon".',
      checks: [
        'Confirm Docker Desktop or the Linux daemon is actually running.',
        'Check that your shell can access the daemon socket or current Docker context.',
      ],
      fix: 'Start the daemon, then verify the active context and socket path before retrying.',
      code: '$ docker context ls\n$ docker version\n$ docker info',
    },
  },
  dockerfile: {
    group: 'workspace',
    name: 'Dockerfile',
    short: 'Recipe for building an image',
    color: '#0ea5e9',
    tag: 'BUILD',
    intro: 'A Dockerfile describes how to turn source code and dependencies into a portable image layer by layer.',
    example: {
      scenario: 'A Next.js app needs Node modules, a production build, and a slim runtime image.',
      action: 'A multi-stage Dockerfile builds in one stage, copies only the compiled output into a smaller runtime stage, and avoids shipping dev dependencies.',
      code: 'FROM node:20 AS build\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\n\nFROM node:20-alpine\nCOPY --from=build /app/.next /app/.next',
    },
    responsibilities: [
      'Define base images, copy steps, and runtime command',
      'Control cache boundaries through layer order',
      'Encode reproducible build steps for CI and local development',
    ],
    deepDive: 'The Dockerfile is where image quality is won or lost. Layer order determines cache efficiency, base image choice affects security and size, and multi-stage builds separate compilation concerns from runtime concerns.',
    docUrl: 'https://docs.docker.com/reference/dockerfile/',
    docLabel: 'Dockerfile reference',
    troubleshooting: {
      symptom: 'Builds are slow and cache misses happen on every code change.',
      checks: [
        'Check whether `COPY . .` happens too early and invalidates later layers.',
        'Verify dependency files are copied separately before application code.',
      ],
      fix: 'Move stable dependency steps above frequently changing source-copy steps and use multi-stage builds.',
      code: '# good cache order\nCOPY package*.json ./\nRUN npm ci\nCOPY . .',
    },
  },
  buildkit: {
    group: 'workspace',
    name: 'BuildKit',
    short: 'Modern Docker build engine',
    color: '#0284c7',
    tag: 'BUILD',
    intro: 'BuildKit parallelizes work, improves caching, supports secrets and mounts, and makes Docker builds much faster and smarter.',
    example: {
      scenario: 'A Go service build needs private modules and aggressive cache reuse in CI.',
      action: 'BuildKit mounts an SSH key during the build, reuses cached layers, and only reruns the minimal set of steps affected by code changes.',
      code: '$ DOCKER_BUILDKIT=1 docker build --ssh default -t atlas-go:latest .',
    },
    responsibilities: [
      'Optimize build graph execution',
      'Support cache mounts, secret mounts, and parallel build steps',
      'Emit rich progress output and portable cache metadata',
    ],
    deepDive: 'Classic `docker build` processed steps in a simpler linear model. BuildKit treats the build as a graph and can skip or parallelize work more intelligently. That matters in real projects where dependencies, assets, and compiled artifacts all have different invalidation patterns.',
    docUrl: 'https://docs.docker.com/build/buildkit/',
    docLabel: 'BuildKit guide',
    troubleshooting: {
      symptom: 'A build needs a secret or SSH key and fails inside CI.',
      checks: [
        'Verify BuildKit is enabled and the secret or SSH mount is actually declared.',
        'Confirm the command uses the mounted path instead of assuming the file exists in the image.',
      ],
      fix: 'Pass secrets through BuildKit mounts instead of copying them into the image.',
      code: 'RUN --mount=type=secret,id=npmrc cat /run/secrets/npmrc',
    },
  },
  'docker-engine': {
    group: 'engine',
    name: 'Docker Engine',
    short: 'Daemon and API that orchestrate builds and containers',
    color: '#2563eb',
    tag: 'ENGINE',
    intro: 'Docker Engine is the long-running service that receives Docker API requests, manages images, and coordinates container lifecycle operations.',
    example: {
      scenario: 'A team runs `docker run -d --name web -p 80:8080 web:2.1`.',
      action: 'The engine checks for the image locally, pulls it if needed, configures ports, storage, and networking, then asks lower-level runtimes to start the container.',
      code: '$ docker run -d --name web -p 80:8080 web:2.1\nb1b22fe8d4d6...',
    },
    responsibilities: [
      'Expose the Docker API to clients',
      'Manage images, containers, volumes, and networks',
      'Delegate runtime work to containerd and runc',
    ],
    deepDive: 'Docker Engine is the control layer. It does not directly implement every isolation primitive itself. Instead it coordinates image management, networking, volumes, and runtime requests over a stable API.',
    docUrl: 'https://docs.docker.com/engine/',
    docLabel: 'Docker Engine docs',
    troubleshooting: {
      symptom: 'Containers fail to start even though the image exists locally.',
      checks: [
        'Inspect the container state and recent engine events.',
        'Review port conflicts, missing volumes, and invalid entrypoint or command values.',
      ],
      fix: 'Use `docker inspect` and `docker events` to separate image problems from runtime configuration problems.',
      code: '$ docker inspect web --format \'{{.State.Status}} {{.State.Error}}\'\n$ docker events --since 10m',
    },
  },
  image: {
    group: 'engine',
    name: 'Image',
    short: 'Immutable packaged filesystem and metadata',
    color: '#f97316',
    tag: 'ARTIFACT',
    intro: 'A Docker image is the built artifact: layered filesystem, metadata, default command, environment, and history.',
    example: {
      scenario: 'CI builds `atlas-api:2026-05-06.3` after a merge to main.',
      action: 'The image gets a unique tag and digest, is scanned, and becomes the exact artifact promoted from dev to staging to production.',
      code: '$ docker images atlas-api\nREPOSITORY   TAG            IMAGE ID       SIZE\natlas-api    2026-05-06.3   4d8d8b8d8c1a   188MB',
    },
    responsibilities: [
      'Package code, dependencies, and startup metadata into a portable artifact',
      'Provide immutable content addressed by digest',
      'Support tagging conventions for release promotion',
    ],
    deepDive: 'An image should be treated as a release artifact, not a mutable environment. The same image digest should move across environments with different runtime configuration, which is how teams avoid "works in staging, fails in prod" drift.',
    docUrl: 'https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-an-image/',
    docLabel: 'What is an image?',
    troubleshooting: {
      symptom: 'The wrong application version is running after a deploy.',
      checks: [
        'Verify the image digest, not just the mutable tag.',
        'Check whether an old local cache or stale registry tag was reused.',
      ],
      fix: 'Promote immutable digests through environments and avoid relying on `latest`.',
      code: '$ docker image inspect atlas-api:prod --format \'{{index .RepoDigests 0}}\'',
    },
  },
  registry: {
    group: 'engine',
    name: 'Registry',
    short: 'Remote store for versioned images',
    color: '#ea580c',
    tag: 'DISTRIBUTION',
    intro: 'Registries like Docker Hub, GHCR, and ECR store pushed images so other machines can pull the exact artifact.',
    example: {
      scenario: 'A CI pipeline publishes a release image after tests pass.',
      action: 'The pipeline authenticates to the registry, pushes the image layers that are not already present, and publishes a tag and digest for downstream deployment steps.',
      code: '$ docker push ghcr.io/acme/atlas-api:1.4.2\nlayer already exists\nlatest: digest: sha256:3f2...',
    },
    responsibilities: [
      'Store image manifests and layers',
      'Enable pull and push workflows across environments',
      'Act as the distribution point for CI/CD pipelines',
    ],
    deepDive: 'Registries are the bridge between build-time and runtime. They decouple where an image is created from where it is executed, and that makes release workflows reliable across teams and environments.',
    docUrl: 'https://docs.docker.com/docker-hub/repos/',
    docLabel: 'Registry and repository docs',
    troubleshooting: {
      symptom: 'A push fails with authentication or permission errors.',
      checks: [
        'Confirm you are logged into the correct registry hostname.',
        'Verify repository permissions and whether the tag target exists.',
      ],
      fix: 'Re-authenticate against the exact registry and confirm the repository path matches the image tag.',
      code: '$ docker login ghcr.io\n$ docker tag atlas-api:1.4 ghcr.io/acme/atlas-api:1.4\n$ docker push ghcr.io/acme/atlas-api:1.4',
    },
  },
  containerd: {
    group: 'runtime',
    name: 'containerd',
    short: 'High-level container runtime manager',
    color: '#0891b2',
    tag: 'RUNTIME',
    intro: 'containerd handles image pulls, snapshots, and container lifecycle requests on behalf of Docker Engine.',
    example: {
      scenario: 'The engine needs to start a container from a freshly pulled image.',
      action: 'containerd unpacks layers into a snapshot, creates the runtime task, and keeps track of the container state for the engine.',
      code: '$ ctr -n moby containers ls\nCONTAINER    IMAGE\nweb          docker.io/library/web:2.1',
    },
    responsibilities: [
      'Manage image content, snapshots, and runtime tasks',
      'Expose a runtime-focused API below Docker Engine',
      'Prepare filesystem state for the OCI runtime',
    ],
    deepDive: 'Docker no longer runs containers through a Docker-specific low-level runtime. containerd is the durable middle layer that knows about content, snapshots, and task management.',
    docUrl: 'https://docs.docker.com/engine/daemon/containerd/',
    docLabel: 'containerd with Docker Engine',
    troubleshooting: {
      symptom: 'An image pulls successfully but the container still does not start.',
      checks: [
        'Inspect whether the snapshot unpacked correctly and the runtime task was created.',
        'Look for permission, mount, or filesystem errors in the runtime path.',
      ],
      fix: 'Differentiate pull success from task start success; they are separate phases.',
      code: '$ docker events --since 5m\n$ docker inspect web --format \'{{json .State}}\'',
    },
  },
  runc: {
    group: 'runtime',
    name: 'runc',
    short: 'OCI runtime that creates the actual container process',
    color: '#0d9488',
    tag: 'OCI',
    intro: 'runc is the low-level runtime that applies Linux namespaces, cgroups, mounts, and security settings, then launches the container process.',
    example: {
      scenario: 'A Java service container is started with CPU and memory limits.',
      action: 'runc creates the isolated process environment, joins the namespace and cgroup configuration, and executes the Java process as PID 1 inside the container.',
      code: 'OCI runtime create -> start -> process launched in isolated namespaces',
    },
    responsibilities: [
      'Apply OCI runtime specification settings',
      'Create namespaces, cgroups, and mounts',
      'Launch the container entrypoint process',
    ],
    deepDive: 'runc is very close to the Linux kernel boundary. It is intentionally narrow. Docker and containerd manage higher-level workflows; runc focuses on correct process isolation and startup.',
    docUrl: 'https://docs.docker.com/engine/security/',
    docLabel: 'Container runtime security',
    troubleshooting: {
      symptom: 'The runtime errors with permission denied, cgroup, or mount failures.',
      checks: [
        'Review whether the container requests privileged behavior, host mounts, or unsupported capabilities.',
        'Check the engine and kernel logs for the exact OCI runtime error.',
      ],
      fix: 'Treat OCI runtime failures as host/runtime configuration issues first, not application issues.',
      code: '$ docker inspect web --format \'{{json .HostConfig}}\'',
    },
  },
  container: {
    group: 'runtime',
    name: 'Container',
    short: 'A running instance of an image',
    color: '#16a34a',
    tag: 'RUNTIME',
    intro: 'A container is the live process created from an image with specific runtime configuration such as ports, environment variables, and mounts.',
    example: {
      scenario: 'You launch a Redis container for local development.',
      action: 'Docker creates the container from the `redis:7` image, maps a host port, mounts a volume for persistence, and starts the Redis server process.',
      code: '$ docker run -d --name redis-dev -p 6379:6379 -v redis-data:/data redis:7',
    },
    responsibilities: [
      'Run the application process defined by the image and runtime config',
      'Expose logs, state, exit code, and restart behavior',
      'Carry environment variables, mounts, and port mappings',
    ],
    deepDive: 'A container is not the image. It is a running instance plus mutable runtime state: process, network attachment, mounts, and exit status. That distinction matters when debugging because image problems and container problems are different classes of failure.',
    docUrl: 'https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-a-container/',
    docLabel: 'What is a container?',
    troubleshooting: {
      symptom: 'The container exits immediately after `docker run`.',
      checks: [
        'Check the container logs and exit code.',
        'Confirm the configured command starts a foreground process instead of daemonizing then exiting.',
      ],
      fix: 'Make sure the main process stays in the foreground and validate command, env vars, and mounted config files.',
      code: '$ docker ps -a\n$ docker logs redis-dev\n$ docker inspect redis-dev --format \'{{.State.ExitCode}}\'',
    },
  },
  'layer-cache': {
    group: 'images',
    name: 'Layer Cache',
    short: 'Reusable build layers that keep rebuilds fast',
    color: '#f59e0b',
    tag: 'IMAGE',
    intro: 'Docker reuses unchanged layers between builds so you do not re-download or recompile everything on every change.',
    example: {
      scenario: 'You change only one React component file.',
      action: 'Docker reuses the base image, dependency install, and earlier layers, then reruns only the copy and build steps invalidated by the source change.',
      code: '=> CACHED [2/6] COPY package*.json ./\n=> CACHED [3/6] RUN npm ci\n=> [4/6] COPY . .',
    },
    responsibilities: [
      'Reuse build outputs for unchanged instructions',
      'Reduce local and CI build time',
      'Encourage stable layer ordering in Dockerfiles',
    ],
    deepDive: 'Layer caching is where careful Dockerfile design pays off. Stable dependency layers should sit above volatile source layers, or every small edit turns into a full rebuild.',
    docUrl: 'https://docs.docker.com/build/cache/',
    docLabel: 'Build cache docs',
    troubleshooting: {
      symptom: 'Every CI build is cold and takes too long.',
      checks: [
        'Confirm whether your CI runner restores the previous cache or inline cache metadata.',
        'Check whether tags and cache-from settings point to a valid previous image.',
      ],
      fix: 'Export and import cache metadata explicitly in CI when runners are ephemeral.',
      code: '$ docker build --build-arg BUILDKIT_INLINE_CACHE=1 -t atlas-api:cache .',
    },
  },
  volume: {
    group: 'images',
    name: 'Volume',
    short: 'Persistent storage outside the container filesystem',
    color: '#d97706',
    tag: 'STORAGE',
    intro: 'Volumes keep data alive when containers are recreated. They are the normal way to preserve databases, uploads, caches, and shared working data.',
    example: {
      scenario: 'A Postgres container is recreated after a config change.',
      action: 'The container is new, but the named volume still holds the database files, so data survives the restart.',
      code: '$ docker run -d --name pg -v pg-data:/var/lib/postgresql/data postgres:16',
    },
    responsibilities: [
      'Persist state independently from container lifecycle',
      'Support named volumes and bind mounts',
      'Make local development and stateful services workable',
    ],
    deepDive: 'Containers are disposable by design, so persistent data must live outside the writable container layer. Named volumes are usually safer than ad hoc bind mounts because Docker manages their lifecycle and storage path explicitly.',
    docUrl: 'https://docs.docker.com/engine/storage/volumes/',
    docLabel: 'Docker volumes',
    troubleshooting: {
      symptom: 'Data disappears after a container rebuild or restart.',
      checks: [
        'Verify whether the service writes to the container filesystem or to a mounted volume.',
        'Inspect the mounts section of the running container.',
      ],
      fix: 'Mount a named volume to the application data path and verify the path inside the container is correct.',
      code: '$ docker inspect pg --format \'{{json .Mounts}}\'',
    },
  },
  'bridge-network': {
    group: 'images',
    name: 'Bridge Network',
    short: 'Default local network for container-to-container traffic',
    color: '#7c3aed',
    tag: 'NETWORK',
    intro: 'Docker bridge networks let containers communicate by name on the same host while exposing only selected ports externally.',
    example: {
      scenario: 'A web container needs to talk to a local Postgres container.',
      action: 'Both join the same user-defined bridge network. The web app can connect to hostname `postgres` directly without hard-coded IP addresses.',
      code: '$ docker network create atlas-net\n$ docker run -d --name postgres --network atlas-net postgres:16\n$ docker run -d --name web --network atlas-net web:2.1',
    },
    responsibilities: [
      'Provide DNS and IP connectivity between containers on one host',
      'Isolate services into explicit local networks',
      'Support safe local composition of multi-service apps',
    ],
    deepDive: 'User-defined bridge networks are better than the default bridge because they give you automatic DNS resolution and cleaner isolation. They are the standard local networking primitive for multi-container development.',
    docUrl: 'https://docs.docker.com/engine/network/drivers/bridge/',
    docLabel: 'Bridge network driver',
    troubleshooting: {
      symptom: 'One container cannot reach another by name.',
      checks: [
        'Confirm both containers are attached to the same user-defined network.',
        'Verify the application is listening on the expected container port, not just localhost.',
      ],
      fix: 'Attach both services to the same bridge network and use the container name or service name as the hostname.',
      code: '$ docker network inspect atlas-net',
    },
  },
  compose: {
    group: 'operations',
    name: 'Docker Compose',
    short: 'Multi-container app definition for local and small env workflows',
    color: '#2563eb',
    tag: 'ORCHESTRATION',
    intro: 'Compose lets you describe several services, networks, and volumes in one file and launch them together with one command.',
    example: {
      scenario: 'A local stack needs `web`, `api`, `postgres`, and `redis`.',
      action: 'Compose starts the whole dependency graph, creates the network and volumes, and makes startup repeatable for every developer on the team.',
      code: '$ docker compose up --build\n[+] Running 4/4\n ✔ Container atlas-postgres-1  Started\n ✔ Container atlas-api-1       Started',
    },
    responsibilities: [
      'Define multi-service local environments',
      'Coordinate networks, volumes, build rules, and env files',
      'Make local onboarding reproducible across machines',
    ],
    deepDive: 'Compose is where Docker becomes a usable app platform for development. Instead of many fragile `docker run` commands, you declare the stack once and keep the service graph versioned with the codebase.',
    docUrl: 'https://docs.docker.com/compose/',
    docLabel: 'Docker Compose docs',
    troubleshooting: {
      symptom: 'The stack starts, but one service races another and fails on boot.',
      checks: [
        'Review service health checks and startup dependencies.',
        'Confirm the app retries database or cache connections instead of assuming instant readiness.',
      ],
      fix: 'Add health checks and design the app to tolerate dependency startup lag.',
      code: 'healthcheck:\n  test: ["CMD", "pg_isready", "-U", "postgres"]',
    },
  },
  'docker-logs': {
    group: 'operations',
    name: 'docker logs',
    short: 'Fastest way to inspect live container output',
    color: '#dc2626',
    tag: 'TROUBLESHOOT',
    intro: 'When a container fails, `docker logs` is usually the first place to look. It shows stdout and stderr from the main process.',
    example: {
      scenario: 'An API container restarts right after deployment.',
      action: 'You stream logs and immediately see a missing `DATABASE_URL` environment variable causing startup failure.',
      code: '$ docker logs -f atlas-api\nError: DATABASE_URL is required',
    },
    responsibilities: [
      'Surface application startup and runtime output',
      'Support live streaming during debugging',
      'Reveal fast-fail config and connectivity errors',
    ],
    deepDive: 'Many container failures are not runtime-engine issues at all. They are plain application failures visible in logs within seconds. That is why logs should be your first stop before deeper runtime inspection.',
    docUrl: 'https://docs.docker.com/reference/cli/docker/container/logs/',
    docLabel: 'docker logs reference',
    troubleshooting: {
      symptom: 'A container keeps restarting and you are not sure why.',
      checks: [
        'Stream recent logs and match them with the restart policy.',
        'Check whether the app exits with a non-zero code immediately after startup.',
      ],
      fix: 'Start with logs before changing the image or runtime flags.',
      code: '$ docker logs --tail 100 -f atlas-api',
    },
  },
  'docker-exec': {
    group: 'operations',
    name: 'docker exec',
    short: 'Enter a running container to inspect it live',
    color: '#be123c',
    tag: 'TROUBLESHOOT',
    intro: 'When logs are not enough, `docker exec` lets you inspect files, environment, ports, and running processes inside the live container.',
    example: {
      scenario: 'The app says it cannot find a config file even though the image build succeeded.',
      action: 'You open a shell inside the running container, inspect `/app/config`, and discover the expected file was never copied into the final image stage.',
      code: '$ docker exec -it atlas-api sh\n/app # ls -la /app/config',
    },
    responsibilities: [
      'Inspect the live runtime environment',
      'Validate mounted files, environment variables, and processes',
      'Shorten the feedback loop for operational debugging',
    ],
    deepDive: 'Use `docker exec` to confirm what is actually present at runtime. It closes the gap between what the Dockerfile says should exist and what the live container really has.',
    docUrl: 'https://docs.docker.com/reference/cli/docker/container/exec/',
    docLabel: 'docker exec reference',
    troubleshooting: {
      symptom: 'The build succeeded, but runtime files or env values are missing.',
      checks: [
        'Inspect the final runtime stage, not the build stage assumptions.',
        'Confirm the container user can read mounted files and directories.',
      ],
      fix: 'Use `docker exec` or `docker inspect` to prove the live container state before editing the Dockerfile.',
      code: '$ docker exec -it atlas-api env | sort\n$ docker exec -it atlas-api ps aux',
    },
  },
};

const DOCKER_GROUPS = [
  {
    id: 'workspace',
    title: 'Build Workspace',
    color: '#1d4ed8',
    colorDark: '#1e3a8a',
    gradient: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
    bg: '#eff6ff',
    components: ['docker-user', 'docker-cli', 'dockerfile', 'buildkit'],
  },
  {
    id: 'engine',
    title: 'Image & Distribution',
    color: '#f97316',
    colorDark: '#c2410c',
    gradient: 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)',
    bg: '#fff7ed',
    components: ['docker-engine', 'image', 'registry'],
  },
  {
    id: 'runtime',
    title: 'Runtime Stack',
    color: '#16a34a',
    colorDark: '#166534',
    gradient: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
    bg: '#f0fdf4',
    components: ['containerd', 'runc', 'container'],
  },
];

const DOCKER_GROUP_COLOR_MAP = {
  'docker-user': '#1d4ed8',
  'docker-cli': '#1d4ed8',
  dockerfile: '#1d4ed8',
  buildkit: '#1d4ed8',
  'docker-engine': '#f97316',
  image: '#f97316',
  registry: '#f97316',
  containerd: '#16a34a',
  runc: '#16a34a',
  container: '#16a34a',
};

const DOCKER_SECONDARY_SECTIONS = [
  { id: 'images', title: 'Images, Storage & Networking', color: '#8b5cf6', components: ['layer-cache', 'volume', 'bridge-network'] },
  { id: 'operations', title: 'Operations & Troubleshooting', color: '#dc2626', components: ['compose', 'docker-logs', 'docker-exec'] },
];

const DOCKER_FLOWS = [
  ['docker-user', 'docker-cli'],
  ['docker-cli', 'dockerfile'],
  ['docker-cli', 'buildkit'],
  ['dockerfile', 'buildkit'],
  ['buildkit', 'image'],
  ['docker-cli', 'docker-engine'],
  ['docker-engine', 'image'],
  ['image', 'registry'],
  ['docker-engine', 'containerd'],
  ['containerd', 'runc'],
  ['runc', 'container'],
];

const DOCKER_JOURNEY = [
  { title: 'Write the Dockerfile', desc: 'Source code and a Dockerfile define how the image should be assembled.', actor: 'workspace' },
  { title: 'Run docker build', desc: 'The Docker CLI sends the build context to the engine and BuildKit begins execution.', actor: 'docker build' },
  { title: 'Resolve cache and dependencies', desc: 'BuildKit reuses cached layers where possible and executes only the invalidated steps.', actor: 'BuildKit' },
  { title: 'Produce the image', desc: 'A tagged image is created locally with layers, metadata, and a digest.', actor: 'image' },
  { title: 'Push to registry', desc: 'If this is a release build, the image is authenticated and pushed to a remote registry.', actor: 'registry' },
  { title: 'Run the container', desc: 'A `docker run` request asks the engine to start a live instance of the image.', actor: 'engine' },
  { title: 'Prepare filesystem snapshot', desc: 'containerd unpacks the image layers and creates the runtime task state.', actor: 'containerd' },
  { title: 'Apply namespaces and cgroups', desc: 'runc creates the OCI runtime environment and launches the container process.', actor: 'runc' },
  { title: 'Attach network and volume', desc: 'Ports, bridge network, mounts, and env vars are connected to the running container.', actor: 'runtime' },
  { title: 'Troubleshoot live behavior', desc: 'If something fails, use logs, inspect, and exec to debug the running container in real time.', actor: 'ops' },
];

const FUTURE_TOPICS = [
  { id: 'cicd', title: 'CI/CD Pipelines', blurb: 'Jobs, runners, artifacts, approvals, release flow.', color: '#2563eb' },
  { id: 'terraform', title: 'Terraform', blurb: 'Providers, state, modules, plan, apply, drift.', color: '#0d9488' },
  { id: 'monitoring', title: 'Monitoring', blurb: 'Metrics, logs, traces, SLOs, alerts, dashboards.', color: '#dc2626' },
  { id: 'linux', title: 'Linux Internals', blurb: 'Processes, systemd, filesystems, networking, permissions.', color: '#7c3aed' },
  { id: 'cloud', title: 'Cloud Foundations', blurb: 'VPCs, IAM, load balancers, compute, storage.', color: '#ea580c' },
  { id: 'gitops', title: 'GitOps', blurb: 'Argo CD, Flux, reconciliation, promotion and rollback.', color: '#059669' },
];

const TOPICS = {
  kubernetes: {
    id: 'kubernetes',
    name: 'Kubernetes',
    short: 'Cluster anatomy, control loops, and real workloads.',
    accent: '#326ce5',
    accentSoft: '#dbeafe',
    eyebrow: 'Interactive atlas · Kubernetes · every major component',
    heroTitle: 'The anatomy of a cluster, revealed.',
    heroLead: 'Trace how requests move across the control plane, worker nodes, networking, storage, and security layers. Click any component to inspect what it is, what it does, and a real-world example.',
    heroStats: ['35+ components', 'animated control flow', 'production mental model'],
    diagramLabel: 'CLUSTER · prod-01 · main architecture',
    panelHint: 'hover / click components ->',
    sectionsTitle: 'Beyond the control plane',
    sectionsLead: 'The cluster boxes are only the beginning. The real power comes from workload APIs, networking, storage, security, autoscaling, and extensibility.',
    workflowTitle: 'The journey of a kubectl apply',
    workflowLead: 'From laptop command to running pod, this is the request path through the cluster.',
    workflowCommand: 'kubectl apply -f checkout-v2.yaml',
    workflowRealtimeLabel: 'Live request trace',
    compareTitle: 'The mental model',
    compareParagraphs: [
      'Kubernetes is two ideas repeated everywhere: a single source of truth in etcd, and a set of independent control loops that reconcile reality toward the desired state.',
      'Deployments, ReplicaSets, schedulers, kubelets, networking, autoscaling, and operators all follow that same pattern. Once that clicks, the platform stops feeling magical and starts feeling systematic.',
    ],
    footerTicker: 'KUBERNETES · CNCF PROJECT · v1.30',
    emptySearch: 'No Kubernetes component matched that search.',
    comingSoonCopy: 'This topic is on the roadmap for DevOps Atlas. The shell is ready; the explainer content is not published yet.',
    components: KUBERNETES_COMPONENTS,
    groups: KUBERNETES_GROUPS,
    groupColorMap: KUBERNETES_GROUP_COLOR_MAP,
    secondarySections: KUBERNETES_SECONDARY_SECTIONS,
    flows: KUBERNETES_FLOWS,
    journey: KUBERNETES_JOURNEY,
  },
  docker: {
    id: 'docker',
    name: 'Docker',
    short: 'Builds, images, containers, and live troubleshooting.',
    accent: '#0ea5e9',
    accentSoft: '#e0f2fe',
    eyebrow: 'Interactive atlas · Docker · build to runtime',
    heroTitle: 'From Dockerfile to running container.',
    heroLead: 'Follow the full container lifecycle: build, cache, package, push, run, inspect, and troubleshoot. The Docker topic now includes real examples, runtime debugging, and operational subtopics.',
    heroStats: ['14 components', 'real-time troubleshooting', 'build-to-runtime flow'],
    diagramLabel: 'DOCKER · local-dev · build and runtime graph',
    panelHint: 'trace the lifecycle ->',
    sectionsTitle: 'Build, ship, run, debug',
    sectionsLead: 'Docker is more than `docker run`. It spans image construction, distribution, networking, persistence, and fast operational debugging.',
    workflowTitle: 'The journey of a docker build and run',
    workflowLead: 'See how source code becomes an image, then a live container you can inspect in real time.',
    workflowCommand: 'docker build -t atlas-api:1.0 . && docker run -p 8080:8080 atlas-api:1.0',
    workflowRealtimeLabel: 'Live container trace',
    compareTitle: 'Docker in context',
    compareParagraphs: [
      'Docker solves packaging and local runtime consistency. It turns app code, dependencies, and startup logic into a portable artifact that behaves predictably across laptops, CI, and servers.',
      'Kubernetes sits one level higher. Docker builds and runs containers; Kubernetes schedules, heals, scales, and networks them across a cluster.',
    ],
    footerTicker: 'DOCKER · IMAGES · CONTAINERS · TROUBLESHOOTING',
    emptySearch: 'No Docker component matched that search.',
    comingSoonCopy: 'This future topic will get the same interactive treatment as Kubernetes and Docker, with component cards, live flows, and troubleshooting drills.',
    components: DOCKER_COMPONENTS,
    groups: DOCKER_GROUPS,
    groupColorMap: DOCKER_GROUP_COLOR_MAP,
    secondarySections: DOCKER_SECONDARY_SECTIONS,
    flows: DOCKER_FLOWS,
    journey: DOCKER_JOURNEY,
  },
  cicd: CICD_TOPIC,
  terraform: TERRAFORM_TOPIC,
  monitoring: MONITORING_TOPIC,
  linux: LINUX_TOPIC,
  cloud: CLOUD_TOPIC,
  gitops: GITOPS_TOPIC,
};
