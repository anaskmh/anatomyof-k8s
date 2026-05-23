/* Linux Internals Topic Data */
export const LINUX_COMPONENTS = {
  process: {
    group: 'core',
    name: 'Processes',
    short: 'Running programs with PID and state',
    color: '#0891b2',
  },
  systemd: {
    group: 'core',
    name: 'systemd',
    short: 'Init system and service manager',
    color: '#dc2626',
  },
  filesystem: {
    group: 'storage',
    name: 'Filesystems',
    short: 'ext4, btrfs, tmpfs file organization',
    color: '#16a34a',
  },
  networking: {
    group: 'network',
    name: 'Networking Stack',
    short: 'TCP/IP, DNS, routing, sockets',
    color: '#7c3aed',
  },
  permissions: {
    group: 'security',
    name: 'Users & Permissions',
    short: 'UID, GID, capabilities, sudo',
    color: '#ea580c',
  },
  cgroups: {
    group: 'isolation',
    name: 'cgroups',
    short: 'Resource limits for processes',
    color: '#0284c7',
  },
  namespaces: {
    group: 'isolation',
    name: 'Namespaces',
    short: 'Process, network, filesystem isolation',
    color: '#0284c7',
  },
};

export const LINUX_GROUPS = [
  { id: 'core', title: 'Core', color: '#0891b2', components: ['process', 'systemd'] },
  { id: 'storage', title: 'Storage', color: '#16a34a', components: ['filesystem'] },
  { id: 'network', title: 'Networking', color: '#7c3aed', components: ['networking'] },
  { id: 'security', title: 'Security', color: '#ea580c', components: ['permissions'] },
  { id: 'isolation', title: 'Isolation', color: '#0284c7', components: ['cgroups', 'namespaces'] },
];

export const LINUX_SECONDARY_SECTIONS = [
  { id: 'core', title: 'Core', color: '#0891b2', components: ['process', 'systemd'] },
  { id: 'storage', title: 'Storage', color: '#16a34a', components: ['filesystem'] },
  { id: 'network', title: 'Networking', color: '#7c3aed', components: ['networking'] },
  { id: 'security', title: 'Security', color: '#ea580c', components: ['permissions'] },
  { id: 'isolation', title: 'Isolation', color: '#0284c7', components: ['cgroups', 'namespaces'] },
];

export const LINUX_FLOWS = [
  ['process', 'cgroups'],
  ['process', 'namespaces'],
  ['process', 'filesystem'],
  ['systemd', 'process'],
];

export const LINUX_JOURNEY = [
  { title: 'System boots', desc: 'BIOS/UEFI loads bootloader, then kernel.', actor: 'boot' },
  { title: 'Kernel starts', desc: 'Linux kernel initializes hardware and mounts root filesystem.', actor: 'kernel' },
  { title: 'init starts', desc: 'systemd becomes PID 1, parent of all processes.', actor: 'systemd' },
  { title: 'Services start', desc: 'systemd starts configured services (SSH, Docker, app).', actor: 'services' },
  { title: 'Process isolation', desc: 'Processes use namespaces & cgroups for isolation.', actor: 'isolation' },
];

export const LINUX_TOPIC = {
  id: 'linux',
  name: 'Linux Internals',
  short: 'Processes, systemd, filesystems, networking, permissions.',
  accent: '#0891b2',
  accentSoft: '#cffafe',
  heroTitle: 'How Linux works: kernel, processes, and abstractions.',
  heroLead: 'Understand the layers: boot, processes, systemd, filesystems, permissions, and the primitives that enable containerization.',
  heroStats: ['7 core concepts', 'boot to container', 'Linux abstractions'],
  components: LINUX_COMPONENTS,
  groups: LINUX_GROUPS,
  secondarySections: LINUX_SECONDARY_SECTIONS,
  flows: LINUX_FLOWS,
  journey: LINUX_JOURNEY,
};

export default LINUX_TOPIC;
