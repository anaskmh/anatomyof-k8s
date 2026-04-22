import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Search, Play, Pause, ExternalLink, BookOpen, Github, Linkedin } from 'lucide-react';

// ============================================================
// COMPONENT DATA — every Kubernetes component with real examples
// ============================================================
const COMPONENTS = {
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
const GROUPS = [
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
const GROUP_COLOR_MAP = {
  user: '#2563eb', kubectl: '#2563eb',
  api: '#7c3aed', etcd: '#7c3aed', scheduler: '#7c3aed', 'controller-manager': '#7c3aed', 'cloud-controller': '#7c3aed',
  kubelet: '#16a34a', 'kube-proxy': '#16a34a', 'container-runtime': '#16a34a', pod: '#16a34a',
};

// Secondary sections (below main diagram)
const SECONDARY_SECTIONS = [
  { id: 'workload', title: 'Workload APIs', color: '#db2777', components: ['deployment', 'replicaset', 'statefulset', 'daemonset', 'job'] },
  { id: 'networking', title: 'Networking', color: '#0891b2', components: ['service', 'ingress', 'network-policy', 'cni', 'core-dns'] },
  { id: 'storage', title: 'Storage', color: '#0d9488', components: ['pv', 'pvc', 'storage-class', 'csi'] },
  { id: 'config', title: 'Config & Security', color: '#ca8a04', components: ['configmap', 'secret', 'rbac', 'service-account', 'namespace'] },
  { id: 'autoscaling', title: 'Autoscaling', color: '#be123c', components: ['hpa', 'vpa', 'cluster-autoscaler'] },
  { id: 'observability', title: 'Observability & Extensibility', color: '#9333ea', components: ['metrics-server', 'admission-controller', 'crd'] },
];

// Flow connections for animated lines in main diagram
const FLOWS = [
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
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [search, setSearch] = useState('');
  const componentRefs = useRef({});
  const containerRef = useRef(null);
  const [svgDims, setSvgDims] = useState({ w: 0, h: 0 });
  const [paths, setPaths] = useState([]);

  const orderedIds = Object.keys(COMPONENTS);
  const currentIdx = selected ? orderedIds.indexOf(selected) : -1;

  const computePaths = () => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    setSvgDims({ w: containerRect.width, h: containerRect.height });

    const newPaths = FLOWS.map(([fromId, toId]) => {
      const fromEl = componentRefs.current[fromId];
      const toEl = componentRefs.current[toId];
      if (!fromEl || !toEl) return null;

      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();

      // Determine which side of each box the connector should start/end
      // based on horizontal positions (left-to-right flow is the default)
      const fromCenterX = fromRect.left + fromRect.width / 2;
      const toCenterX = toRect.left + toRect.width / 2;
      const leftToRight = fromCenterX < toCenterX;

      const x1 = (leftToRight ? fromRect.right : fromRect.left) - containerRect.left;
      const y1 = fromRect.top - containerRect.top + fromRect.height / 2;
      const x2 = (leftToRight ? toRect.left : toRect.right) - containerRect.left;
      const y2 = toRect.top - containerRect.top + toRect.height / 2;

      // Smooth bezier: control points pulled ~55% toward the target horizontally,
      // producing gracefully curving flows rather than tight S-curves.
      const dx = Math.abs(x2 - x1);
      const curveStrength = Math.max(60, dx * 0.55);
      const cp1x = leftToRight ? x1 + curveStrength : x1 - curveStrength;
      const cp2x = leftToRight ? x2 - curveStrength : x2 + curveStrength;
      const d = `M ${x1} ${y1} C ${cp1x} ${y1}, ${cp2x} ${y2}, ${x2} ${y2}`;

      const colorFrom = GROUP_COLOR_MAP[fromId] || COMPONENTS[fromId]?.color || '#64748b';
      const colorTo = GROUP_COLOR_MAP[toId] || COMPONENTS[toId]?.color || '#64748b';

      return {
        from: fromId,
        to: toId,
        d,
        x1, y1, x2, y2,
        colorFrom,
        colorTo,
        color: colorFrom, // back-compat
      };
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
  }, []);

  const isHighlighted = (id) => {
    if (!selected && !hovered) return true;
    const active = selected || hovered;
    if (active === id) return true;
    return FLOWS.some(([f, t]) => (f === active && t === id) || (t === active && f === id));
  };

  const isPathActive = (p) => {
    const active = selected || hovered;
    if (!active) return false;
    return p.from === active || p.to === active;
  };

  const filteredSecondary = (list) => {
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter((id) => {
      const c = COMPONENTS[id];
      return c.name.toLowerCase().includes(q) || c.short.toLowerCase().includes(q) || c.intro.toLowerCase().includes(q);
    });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fbf8f1', position: 'relative' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');

        * { box-sizing: border-box; }
        body { margin: 0; background: #fbf8f1; font-family: 'IBM Plex Sans', sans-serif; -webkit-font-smoothing: antialiased; }

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

        @keyframes card-glow {
          0%, 100% { box-shadow: 0 2px 6px -2px rgba(0,0,0,0.08); }
          50% { box-shadow: 0 6px 16px -4px rgba(0,0,0,0.18); }
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
      `}</style>

      <div className="grain" style={{ position: 'relative', zIndex: 1 }}>
        {/* ===================== HEADER ===================== */}
        <header style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          background: 'rgba(251, 248, 241, 0.88)',
          backdropFilter: 'blur(14px)',
          borderBottom: '1px solid #e8e0cc',
          padding: '16px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Helm />
            <div style={{
              fontFamily: "'Instrument Serif', serif",
              fontSize: 26,
              letterSpacing: '-0.01em',
              fontWeight: 400,
            }}>
              Kubernetes <em style={{ color: '#326ce5' }}>Explainer</em>
            </div>
          </div>

          <div style={{
            position: 'relative',
            flex: 1,
            maxWidth: 360,
          }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8a8270' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search: hpa, ingress, csi, namespace..."
              style={{
                width: '100%',
                padding: '9px 12px 9px 34px',
                borderRadius: 999,
                border: '1px solid #e8e0cc',
                background: '#fff',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12,
                outline: 'none',
                color: '#2a2a2a',
              }}
            />
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
            }}
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
            {isPlaying ? 'PAUSE FLOW' : 'PLAY FLOW'}
          </button>
        </header>

        {/* ===================== HERO ===================== */}
        <section style={{ padding: '72px 32px 28px', textAlign: 'center' }}>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            letterSpacing: '0.25em',
            color: '#8a8270',
            textTransform: 'uppercase',
            marginBottom: 22,
          }}>
            <span style={{
              display: 'inline-block',
              width: 8, height: 8,
              background: '#ea580c',
              borderRadius: '50%',
              marginRight: 10,
              verticalAlign: 'middle',
              animation: 'pulse-dot 1.8s ease-in-out infinite',
            }} />
            Interactive · Kubernetes v1.30 · Every component
          </div>
          <h1 style={{
            fontFamily: "'Instrument Serif', serif",
            fontSize: 'clamp(44px, 7vw, 92px)',
            lineHeight: 0.98,
            letterSpacing: '-0.025em',
            margin: '0 auto 18px',
            maxWidth: 1100,
            fontWeight: 400,
          }}>
            The anatomy of a <em style={{ fontStyle: 'italic', color: '#326ce5', fontWeight: 400 }}>cluster</em>, revealed.
          </h1>
          <p style={{
            maxWidth: 660,
            margin: '0 auto',
            color: '#4a4636',
            fontSize: 17,
            lineHeight: 1.55,
          }}>
            Click any component to see what it is, what it does, and a real-world example of it in action. Every box in the diagram is a real part of Kubernetes — hover to trace connections, click to dive deep.
          </p>
        </section>

        {/* ===================== MAIN DIAGRAM ===================== */}
        <section style={{ maxWidth: 1400, margin: '40px auto', padding: '0 24px' }}>
          <div
            ref={containerRef}
            style={{
              position: 'relative',
              background: '#fff',
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
              <span style={{ display: 'inline-block', width: 6, height: 6, background: '#16a34a', borderRadius: '50%', marginRight: 8, animation: 'pulse-dot 1.5s infinite' }} />
              CLUSTER · prod-01 · main architecture
            </div>
            <div style={{
              position: 'absolute', top: 20, right: 32,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10, letterSpacing: '0.18em', color: '#8a8270', textTransform: 'uppercase',
            }}>
              hover / click components →
            </div>

            {/* SVG Connectors */}
            <svg
              width={svgDims.w}
              height={svgDims.h}
              style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 1 }}
            >
              <defs>
                {/* Glow filter */}
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                {/* Gradient per path (from source color to target color) */}
                {paths.map((p, i) => (
                  <linearGradient key={`g-${i}`} id={`flow-grad-${i}`} gradientUnits="userSpaceOnUse"
                    x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2}>
                    <stop offset="0%" stopColor={p.colorFrom} stopOpacity="0.9" />
                    <stop offset="100%" stopColor={p.colorTo} stopOpacity="0.9" />
                  </linearGradient>
                ))}
                {paths.map((p, i) => (
                  <marker key={`m-${i}`} id={`arrow-${i}`} viewBox="0 0 10 10" refX="9" refY="5"
                    markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill={p.colorTo} />
                  </marker>
                ))}
              </defs>

              {/* Render paths */}
              {paths.map((p, i) => {
                const active = isPathActive(p);
                const dimmed = (selected || hovered) && !active;
                return (
                  <g key={i}>
                    {/* Soft glow underlay */}
                    <path
                      d={p.d}
                      fill="none"
                      stroke={`url(#flow-grad-${i})`}
                      strokeWidth={active ? 10 : 6}
                      opacity={dimmed ? 0.03 : (active ? 0.35 : 0.18)}
                      filter="url(#glow)"
                      style={{ transition: 'opacity 0.3s, stroke-width 0.3s' }}
                    />
                    {/* Main gradient line */}
                    <path
                      d={p.d}
                      fill="none"
                      stroke={`url(#flow-grad-${i})`}
                      strokeWidth={active ? 3 : 2}
                      strokeLinecap="round"
                      opacity={dimmed ? 0.18 : 1}
                      markerEnd={`url(#arrow-${i})`}
                      style={{ transition: 'opacity 0.3s, stroke-width 0.3s' }}
                    />
                    {/* Animated dashed overlay — gives the traveling feel */}
                    <path
                      d={p.d}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth={active ? 2 : 1.2}
                      strokeDasharray="4 8"
                      strokeLinecap="round"
                      opacity={dimmed ? 0.12 : 0.75}
                      className={`flow-path ${!isPlaying ? 'paused' : ''}`}
                    />
                    {/* Traveling particle (moving dot along the path) */}
                    {!dimmed && (
                      <circle r={active ? 4.5 : 3.5} fill={p.colorTo} filter="url(#glow)">
                        <animateMotion
                          dur={active ? '1.6s' : '2.4s'}
                          repeatCount="indefinite"
                          path={p.d}
                          rotate="auto"
                        />
                      </circle>
                    )}
                    {/* Second particle offset — for a trail effect */}
                    {active && (
                      <circle r="2.5" fill="#ffffff" opacity="0.9">
                        <animateMotion
                          dur="1.6s"
                          repeatCount="indefinite"
                          path={p.d}
                          begin="0.3s"
                        />
                      </circle>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Groups grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1.35fr 1fr',
              gap: 32,
              marginTop: 30,
              position: 'relative',
              zIndex: 2,
            }}>
              {GROUPS.map((group, gi) => (
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
                  {/* Group title badge */}
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
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: '#fff', animation: 'pulse-dot 1.8s infinite',
                    }} />
                    {group.title}
                  </div>
                  {/* Component count pill */}
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
                      data={COMPONENTS[id]}
                      groupColor={group.color}
                      groupColorDark={group.colorDark}
                      onClick={() => setSelected(id)}
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

        {/* ===================== SECONDARY SECTIONS ===================== */}
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
              Beyond the control plane — <em style={{ color: '#326ce5', fontStyle: 'italic' }}>the rest of the system</em>
            </h2>
            <p style={{ color: '#6b6552', fontSize: 17, marginTop: 12, maxWidth: 760 }}>
              The boxes above are the physical parts of a cluster. But Kubernetes gets its real power from higher-level abstractions — workload APIs, networking, storage, security, autoscaling, and extensibility. Click any card to drill into a real example.
            </p>
          </div>

          {SECONDARY_SECTIONS.map((sec, si) => {
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
                  <h3 style={{
                    fontFamily: "'Instrument Serif', serif",
                    fontSize: 30,
                    letterSpacing: '-0.01em',
                    fontWeight: 400,
                    margin: 0,
                  }}>
                    {sec.title}
                  </h3>
                  <span style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10,
                    color: '#8a8270',
                    letterSpacing: '0.12em',
                  }}>
                    {filtered.length} components
                  </span>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: 14,
                }}>
                  {filtered.map((id, ci) => (
                    <SecondaryCard
                      key={id}
                      id={id}
                      data={COMPONENTS[id]}
                      accent={sec.color}
                      onClick={() => setSelected(id)}
                      delay={si * 0.05 + ci * 0.03}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        {/* ===================== KUBECTL APPLY FLOW ===================== */}
        <section style={{ maxWidth: 1400, margin: '80px auto 40px', padding: '0 24px' }}>
          <h2 style={{
            fontFamily: "'Instrument Serif', serif",
            fontSize: 48,
            letterSpacing: '-0.02em',
            fontWeight: 400,
            lineHeight: 1.05,
            margin: '0 0 12px',
          }}>
            The journey of a <em style={{ color: '#326ce5', fontStyle: 'italic' }}>kubectl apply</em>
          </h2>
          <p style={{ color: '#6b6552', fontSize: 17, marginBottom: 36, maxWidth: 680 }}>
            From your laptop terminal to a running container, here's every step of a deployment request.
          </p>

          <div className="scrollbar-styled" style={{
            display: 'flex',
            gap: 14,
            overflowX: 'auto',
            paddingBottom: 24,
            scrollSnapType: 'x mandatory',
          }}>
            {JOURNEY.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: i * 0.04 }}
                style={{
                  minWidth: 270,
                  background: '#fff',
                  border: '1px solid #e8e0cc',
                  borderRadius: 14,
                  padding: 22,
                  scrollSnapAlign: 'start',
                  position: 'relative',
                }}
              >
                <div style={{
                  fontFamily: "'Instrument Serif', serif",
                  fontSize: 46,
                  fontStyle: 'italic',
                  color: '#d6cfbe',
                  lineHeight: 1,
                  fontWeight: 400,
                }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div style={{
                  fontSize: 15,
                  fontWeight: 600,
                  marginTop: 8,
                  marginBottom: 6,
                  color: '#1a1a1a',
                }}>
                  {step.title}
                </div>
                <div style={{ fontSize: 12.5, color: '#6b6552', lineHeight: 1.55 }}>
                  {step.desc}
                </div>
                <div style={{
                  marginTop: 14,
                  padding: '3px 8px',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10,
                  background: '#1a1a1a',
                  color: '#fbf8f1',
                  display: 'inline-block',
                  borderRadius: 4,
                  letterSpacing: '0.04em',
                }}>
                  {step.actor}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ===================== INTRO TEXT ===================== */}
        <section style={{ maxWidth: 780, margin: '80px auto', padding: '0 24px' }}>
          <h2 style={{
            fontFamily: "'Instrument Serif', serif",
            fontSize: 42,
            letterSpacing: '-0.02em',
            fontWeight: 400,
            margin: '0 0 20px',
          }}>
            The mental model
          </h2>
          <p style={{ fontSize: 17, color: '#3a3628', lineHeight: 1.7, marginBottom: 16 }}>
            Kubernetes is two ideas, repeated everywhere. First: <em style={{ fontStyle: 'italic', color: '#326ce5' }}>a single source of truth</em> — etcd — that you can only reach through the API Server. Second: <em style={{ fontStyle: 'italic', color: '#326ce5' }}>independent control loops</em> that each watch a slice of that truth and nudge reality toward the desired state.
          </p>
          <p style={{ fontSize: 17, color: '#3a3628', lineHeight: 1.7, marginBottom: 16 }}>
            A Deployment controller keeps ReplicaSets right. A ReplicaSet controller keeps pod counts right. A scheduler is just a controller that assigns pods to nodes. kubelet is a node-local controller that makes pods actually exist. Everything is reconciliation.
          </p>
          <p style={{ fontSize: 17, color: '#3a3628', lineHeight: 1.7 }}>
            Once you see the pattern, the rest is specialization — networking loops, storage loops, autoscaling loops, your own operators. That is Kubernetes.
          </p>
        </section>

        {/* ===================== FOOTER ===================== */}
        <footer style={{
          padding: '48px 32px 40px',
          textAlign: 'center',
          borderTop: '1px solid #e8e0cc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 18,
        }}>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            color: '#8a8270',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}>
            Built by
          </div>
          <div style={{
            fontFamily: "'Instrument Serif', serif",
            fontSize: 28,
            fontWeight: 400,
            letterSpacing: '-0.01em',
            color: '#1a1a1a',
          }}>
            Anas <em style={{ fontStyle: 'italic', color: '#326ce5' }}>Kadambalath</em>
          </div>

          {/* Social links row */}
          <div style={{
            display: 'flex',
            gap: 14,
            marginTop: 4,
          }}>
            <a
              href="https://github.com/anaskmh"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              title="GitHub · anaskmh"
              style={socialLinkStyle('#1a1a1a')}
              onMouseEnter={(e) => hoverIn(e, '#1a1a1a')}
              onMouseLeave={(e) => hoverOut(e, '#1a1a1a')}
            >
              <Github size={18} />
              <span style={socialLabelStyle}>GitHub</span>
            </a>
            <a
              href="https://www.linkedin.com/in/anaskadambalath/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              title="LinkedIn · Anas Kadambalath"
              style={socialLinkStyle('#0a66c2')}
              onMouseEnter={(e) => hoverIn(e, '#0a66c2')}
              onMouseLeave={(e) => hoverOut(e, '#0a66c2')}
            >
              <Linkedin size={18} />
              <span style={socialLabelStyle}>LinkedIn</span>
            </a>
            <a
              href="https://medium.com/@anaskmh"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Medium"
              title="Medium · @anaskmh"
              style={socialLinkStyle('#000000')}
              onMouseEnter={(e) => hoverIn(e, '#000000')}
              onMouseLeave={(e) => hoverOut(e, '#000000')}
            >
              <MediumIcon size={18} />
              <span style={socialLabelStyle}>Medium</span>
            </a>
          </div>

          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            color: '#b0a892',
            letterSpacing: '0.16em',
            marginTop: 6,
          }}>
            KUBERNETES · CNCF PROJECT · v1.30
          </div>
        </footer>
      </div>

      {/* ===================== DETAIL PANEL ===================== */}
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
              width: 480,
              maxWidth: 'calc(100vw - 40px)',
              background: '#fbf8f1',
              border: '1.5px solid #1a1a1a',
              borderRadius: 18,
              boxShadow: '10px 12px 0 #1a1a1a, 0 30px 80px -20px rgba(0,0,0,0.35)',
              zIndex: 60,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <DetailPanel
              id={selected}
              data={COMPONENTS[selected]}
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
    </div>
  );
}

// ============================================================
// HELM LOGO
// ============================================================
function Helm() {
  // Official Kubernetes mark: white-outlined heptagon with a ship's wheel
  return (
    <svg width="34" height="34" viewBox="0 0 100 100" fill="none" aria-label="Kubernetes logo">
      {/* Heptagon (7-sided) — approximates the official mark */}
      <polygon
        points="50,4 93,25 93,75 50,96 7,75 7,25"
        fill="#326ce5"
        stroke="#ffffff"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      {/* Ship's wheel */}
      <g transform="translate(50 50)" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" fill="none">
        {/* Outer rim */}
        <circle r="22" />
        {/* Inner hub */}
        <circle r="5" fill="#ffffff" stroke="none" />
        {/* 8 spokes with handles (rotated every 45°) */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <g key={deg} transform={`rotate(${deg})`}>
            <line x1="0" y1="-5" x2="0" y2="-22" />
            <line x1="0" y1="-22" x2="0" y2="-30" />
            <circle cx="0" cy="-31.5" r="2" fill="#ffffff" stroke="none" />
          </g>
        ))}
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

        {/* OFFICIAL DOCS LINK */}
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
              <span>{data.docLabel || 'Learn more on kubernetes.io'}</span>
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
const JOURNEY = [
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
