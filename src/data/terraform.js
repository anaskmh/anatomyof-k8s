/* ============================================================
   TERRAFORM TOPIC DATA
   Infrastructure as Code: Providers, state, modules, workflows
   ============================================================ */

export const TERRAFORM_COMPONENTS = {
  'terraform-cli': {
    group: 'core',
    name: 'Terraform CLI',
    short: 'Command-line tool for infrastructure automation',
    color: '#7c3aed',
    tag: 'CORE',
    intro: 'The Terraform CLI parses HCL configuration files, communicates with providers, manages state, and orchestrates infrastructure changes.',
    example: {
      scenario: 'Deploy an EKS cluster from Terraform code.',
      action: 'Run `terraform plan` to preview changes, then `terraform apply` to create the cluster. Terraform talks to AWS API, provisions resources, and stores state.',
      code: '$ terraform init\n$ terraform plan\n$ terraform apply\nApplied 23 resources',
    },
    responsibilities: [
      'Parse HCL/JSON infrastructure definitions',
      'Init providers and download modules',
      'Run plan to preview infrastructure changes',
      'Apply or destroy infrastructure',
      'Manage the state file (local or remote)',
    ],
    deepDive: 'The Terraform CLI is the user-facing binary. It reads .tf files in the working directory, initializes providers (downloads plugins), validates syntax, locks state, and communicates with provider APIs. The key commands: init (setup), plan (preview), apply (execute), destroy (teardown), state (inspect/modify).',
    docUrl: 'https://www.terraform.io/cli',
    docLabel: 'Terraform CLI documentation',
  },

  'provider': {
    group: 'provider',
    name: 'Provider (AWS, GCP, Azure, etc)',
    short: 'Plugin that interfaces with cloud APIs',
    color: '#0d9488',
    tag: 'PROVIDER',
    intro: 'Providers translate Terraform resource definitions into API calls to cloud platforms. Each cloud has a provider (aws, google, azurerm).',
    example: {
      scenario: 'You define aws_s3_bucket in Terraform.',
      action: 'AWS provider receives the definition, calls S3 API CreateBucket, polls for completion, returns bucket name and ARN back to Terraform.',
      code: 'resource "aws_s3_bucket" "data" {\n  bucket = "my-data-bucket"\n}',
    },
    responsibilities: [
      'Authenticate to cloud APIs (keys, IAM, OIDC)',
      'Translate Terraform resource syntax to provider API calls',
      'Implement Create, Read, Update, Delete (CRUD) for each resource type',
      'Handle API polling and eventual consistency',
      'Report errors back to Terraform with clear messages',
    ],
    deepDive: 'Providers are plugins written in Go. AWS provider has ~500+ resource types. Each provider is versioned independently; you pin provider versions in terraform.lock.hcl to ensure reproducible deploys. Providers handle authentication (keys, roles, OIDC tokens) and make the actual API calls.',
    docUrl: 'https://registry.terraform.io/browse/providers',
    docLabel: 'Terraform Provider Registry',
  },

  'state-management': {
    group: 'backend',
    name: 'State Management',
    short: 'Persistent storage of infrastructure metadata',
    color: '#dc2626',
    tag: 'BACKEND',
    intro: 'Terraform state file (.tfstate) tracks which real infrastructure resources match your configuration. State is the single source of truth.',
    example: {
      scenario: 'You provision an EC2 instance. Terraform stores its instance ID, public IP, and other attributes in state.',
      action: 'Later, you change instance type. Terraform compares current config to state, sees the change, and plans to recreate the instance.',
      code: 'terraform state show aws_instance.web\nresource "aws_instance" "web" {\n  id = "i-0123456789abcdef0"\n  instance_type = "t3.micro"',
    },
    responsibilities: [
      'Store infrastructure resource IDs and metadata',
      'Map Terraform addresses (aws_instance.web) to real resource IDs',
      'Support local state (terraform.tfstate) and remote backends (S3, Terraform Cloud)',
      'Implement locking to prevent concurrent modifications',
      'Enable state migrations between backends',
    ],
    deepDive: 'Without state, Terraform would have to query every resource every time to know the current state — impossibly slow and error-prone. State file is JSON that maps Terraform resource addresses to real AWS resource IDs. For teams, remote state (S3 + DynamoDB lock table) replaces local state. State contains secrets (passwords, tokens), so it must be encrypted at rest and in transit.',
    docUrl: 'https://www.terraform.io/language/state',
    docLabel: 'Terraform State documentation',
  },

  'module': {
    group: 'abstraction',
    name: 'Modules',
    short: 'Reusable infrastructure templates',
    color: '#0891b2',
    tag: 'ABSTRACTION',
    intro: 'Modules package related resources into reusable units. A module can be a local folder or published to the Terraform Registry.',
    example: {
      scenario: 'You have a module for a standard EKS cluster that handles VPC, subnets, security groups, IRSA, and logging.',
      action: 'Dev team calls the module, passing cluster name and node count. Module creates all required resources. Code is DRY and teams follow the same pattern.',
      code: 'module "eks" {\n  source = "terraform-aws-modules/eks/aws"\n  cluster_name = "prod-cluster"\n  node_group_desired_size = 3\n}',
    },
    responsibilities: [
      'Bundle related resources with sane defaults',
      'Accept input variables (cluster name, region, size)',
      'Output important values (load balancer DNS, cluster endpoint)',
      'Support version pinning for stability',
      'Enable module registries and sharing across teams',
    ],
    deepDive: 'A module is just a folder with .tf files. Modules can be local (./modules/vpc) or remote (published to Terraform Registry with version tags). Complex infrastructure is built from 5-10 modules. Module inputs are variables; outputs are exported values. Modules promote consistency: one team maintains the "corporate VPC module," all projects use it.',
    docUrl: 'https://www.terraform.io/language/modules',
    docLabel: 'Terraform Modules documentation',
  },

  'plan-apply': {
    group: 'workflow',
    name: 'Plan & Apply Workflow',
    short: 'Preview then execute infrastructure changes',
    color: '#059669',
    tag: 'WORKFLOW',
    intro: 'Plan shows what Terraform will change. Apply executes those changes. This separation enables review before action.',
    example: {
      scenario: 'You want to upgrade an RDS instance from db.t2.micro to db.t3.small.',
      action: 'Run `terraform plan`; output shows "aws_db_instance.prod will be replaced (forced update)". Review the plan. Run `terraform apply` and select "yes" to proceed.',
      code: '$ terraform plan\n# aws_db_instance.prod will be replaced\n$ terraform apply\nApply complete! Resources: 1 added, 1 changed, 0 destroyed',
    },
    responsibilities: [
      'Analyze configuration against state and real infrastructure',
      'Generate plan showing Add, Change, Destroy actions',
      'Allow human review of plan before applying',
      'Execute apply with human approval',
      'Report actual changes made and final state',
    ],
    deepDive: 'Plan is deterministic: running plan twice produces the same plan. This is why Terraform is safe for automation: no surprises. Plans can be saved to a file and applied later. In CI/CD, plan runs on PR, humans review, then apply runs on merge to main.',
    docUrl: 'https://www.terraform.io/cli/commands/plan',
    docLabel: 'Terraform Plan documentation',
  },

  'drift-detection': {
    group: 'validation',
    name: 'Drift Detection',
    short: 'Find infrastructure differences from Terraform code',
    color: '#f59e0b',
    tag: 'VALIDATION',
    intro: 'Drift occurs when someone manually changes infrastructure outside Terraform. Terraform can detect and remediate drift.',
    example: {
      scenario: 'A security team manually adds a firewall rule to prod security group.',
      action: 'Next Terraform run detects the extra rule (drift). Terraform can refresh state or destroy the manual change based on policy.',
      code: '$ terraform plan -refresh=true\nDrift Detected:\n  aws_security_group.prod: rule manually added',
    },
    responsibilities: [
      'Refresh state by querying current cloud resources',
      'Compare current state to Terraform code',
      'Detect added, removed, or modified resources',
      'Report drift to users and systems (audit, monitoring)',
      'Support auto-remediation of drift',
    ],
    deepDive: 'Drift is inevitable in large teams. Solution: `terraform plan -refresh=true` queries cloud to detect drift. For continuous monitoring, use Terraform Cloud drift detection (polls every 6 hours). Most teams have a policy: "declare what Terraform manages, everything else is manual, and Terraform wins in conflicts."',
    docUrl: 'https://www.terraform.io/cloud/workspaces/state#drift',
    docLabel: 'Terraform Drift Detection',
  },

  'workspace': {
    group: 'organization',
    name: 'Workspaces',
    short: 'Environment separation (dev, staging, prod)',
    color: '#8b5cf6',
    tag: 'ORGANIZATION',
    intro: 'Workspaces let you manage separate infrastructure instances (dev, staging, prod) with the same code. Each workspace has its own state.',
    example: {
      scenario: 'You have one set of .tf files that deploy to dev, staging, and prod. Workspaces separate the state.',
      action: 'terraform workspace select dev && terraform apply deploys to dev cluster. terraform workspace select prod && terraform apply deploys to prod. Same code, different state files.',
      code: '$ terraform workspace list\n  default\n* dev\n  staging\n  prod\n$ terraform apply',
    },
    responsibilities: [
      'Maintain separate state files per workspace',
      'Allow code reuse across environments',
      'Support tfvars for environment-specific variables',
      'Isolate state to prevent cross-env accidents',
      'Support import/export of state between workspaces',
    ],
    deepDive: 'Workspaces are a simple way to manage multiple environments with one code base. However, many teams prefer separate directories/repos per environment for safety. The trade-off: workspaces are DRY (less code), but separate repos make accidental deletions harder.',
    docUrl: 'https://www.terraform.io/cloud/workspaces',
    docLabel: 'Terraform Workspaces',
  },
};

export const TERRAFORM_GROUPS = [
  {
    id: 'core',
    title: 'Core Tools',
    color: '#7c3aed',
    gradient: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
    bg: '#faf5ff',
    components: ['terraform-cli'],
  },
  {
    id: 'provider',
    title: 'Cloud Providers',
    color: '#0d9488',
    gradient: 'linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%)',
    bg: '#f0fdfa',
    components: ['provider'],
  },
  {
    id: 'backend',
    title: 'State & Backend',
    color: '#dc2626',
    gradient: 'linear-gradient(135deg, #fecaca 0%, #fca5a5 100%)',
    bg: '#fef2f2',
    components: ['state-management'],
  },
  {
    id: 'abstraction',
    title: 'Abstraction & Reuse',
    color: '#0891b2',
    gradient: 'linear-gradient(135deg, #a5f3fc 0%, #67e8f9 100%)',
    bg: '#f0f9fa',
    components: ['module'],
  },
  {
    id: 'workflow',
    title: 'Workflow & Execution',
    color: '#059669',
    gradient: 'linear-gradient(135deg, #a7f3d0 0%, #6ee7b7 100%)',
    bg: '#f0fdf4',
    components: ['plan-apply'],
  },
  {
    id: 'validation',
    title: 'Validation & Compliance',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #fcd34d 0%, #fbbf24 100%)',
    bg: '#fffbeb',
    components: ['drift-detection'],
  },
  {
    id: 'organization',
    title: 'Organization & Scaling',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #e9d5ff 0%, #ddd6fe 100%)',
    bg: '#faf5ff',
    components: ['workspace'],
  },
];

export const TERRAFORM_GROUP_COLOR_MAP = {
  'terraform-cli': '#7c3aed',
  'provider': '#0d9488',
  'state-management': '#dc2626',
  'module': '#0891b2',
  'plan-apply': '#059669',
  'drift-detection': '#f59e0b',
  'workspace': '#8b5cf6',
};

export const TERRAFORM_SECONDARY_SECTIONS = [
  { id: 'core', title: 'Core Tools', color: '#7c3aed', components: ['terraform-cli'] },
  { id: 'provider', title: 'Cloud Providers', color: '#0d9488', components: ['provider'] },
  { id: 'backend', title: 'State & Backend', color: '#dc2626', components: ['state-management'] },
  { id: 'abstraction', title: 'Abstraction & Reuse', color: '#0891b2', components: ['module'] },
  { id: 'workflow', title: 'Workflow & Execution', color: '#059669', components: ['plan-apply'] },
  { id: 'validation', title: 'Validation & Compliance', color: '#f59e0b', components: ['drift-detection'] },
  { id: 'organization', title: 'Organization & Scaling', color: '#8b5cf6', components: ['workspace'] },
];

export const TERRAFORM_FLOWS = [
  ['terraform-cli', 'provider'],
  ['terraform-cli', 'state-management'],
  ['provider', 'module'],
  ['module', 'plan-apply'],
  ['plan-apply', 'drift-detection'],
  ['state-management', 'workspace'],
];

export const TERRAFORM_JOURNEY = [
  { title: 'Write infrastructure code', desc: 'HCL files define desired infrastructure (VPC, EC2, RDS, etc).', actor: 'code' },
  { title: 'terraform init', desc: 'Download provider plugins and initialize the backend.', actor: 'init' },
  { title: 'terraform plan', desc: 'Analyze code vs state vs cloud; output the diff.', actor: 'plan' },
  { title: 'Review plan', desc: 'Human reviews what will be created, modified, or destroyed.', actor: 'review' },
  { title: 'terraform apply', desc: 'Execute the plan: provision resources via provider APIs.', actor: 'apply' },
  { title: 'State updated', desc: 'State file records created resource IDs and metadata.', actor: 'state' },
  { title: 'Monitoring & alerts', desc: 'New infrastructure is monitored; alerts trigger on issues.', actor: 'monitor' },
  { title: 'Drift check', desc: 'Periodic checks detect manual changes to infrastructure.', actor: 'drift' },
];

export const TERRAFORM_TOPIC = {
  id: 'terraform',
  name: 'Terraform',
  short: 'Infrastructure as Code: providers, state, modules, workflows.',
  accent: '#7c3aed',
  accentSoft: '#ede9fe',
  eyebrow: 'Interactive atlas · Terraform · IaC automation',
  heroTitle: 'Infrastructure as code: provision, manage, and scale.',
  heroLead: 'Understand how Terraform translates HCL code into real infrastructure. Learn about providers, state management, modules, plan/apply workflows, and drift detection.',
  heroStats: ['7 core concepts', 'multi-cloud support', 'safe infrastructure changes'],
  diagramLabel: 'TERRAFORM · provider architecture',
  panelHint: 'explore infrastructure concepts ->',
  sectionsTitle: 'From code to cloud',
  sectionsLead: 'Modules, state backends, workspaces, and best practices for managing infrastructure at scale.',
  workflowTitle: 'The journey of terraform apply',
  workflowLead: 'From HCL code to running resources, tracing how Terraform provisions infrastructure.',
  workflowCommand: 'terraform apply',
  workflowRealtimeLabel: 'Live provisioning trace',
  compareTitle: 'Terraform in context',
  compareParagraphs: [
    'Terraform is one tool in the IaC ecosystem. CloudFormation (AWS-only), Pulumi (programming languages), CDK (AWS), ARM templates (Azure) are alternatives. Terraform wins on multi-cloud support and ease of learning.',
    'Terraform is declarative: you describe desired state; Terraform figures out how to get there. This is safer than imperative scripts (bash, Python) that can fail midway and leave infrastructure in an unknown state.',
  ],
  footerTicker: 'TERRAFORM · HASHICORP · INFRASTRUCTURE AS CODE',
  emptySearch: 'No Terraform concept matched that search.',
  components: TERRAFORM_COMPONENTS,
  groups: TERRAFORM_GROUPS,
  groupColorMap: TERRAFORM_GROUP_COLOR_MAP,
  secondarySections: TERRAFORM_SECONDARY_SECTIONS,
  flows: TERRAFORM_FLOWS,
  journey: TERRAFORM_JOURNEY,
};

export default TERRAFORM_TOPIC;
