import type os from 'node:os';

// Virtual and tunnel adapters (WSL, Hyper-V, Docker, VMs, VPNs) that phones on the Wi-Fi usually can't reach.
const VIRTUAL = /vEthernet|WSL|Hyper-V|Docker|VirtualBox|VMware|VPN|NordLynx|Tailscale|ZeroTier|tun|tap/i;

/**
 * URLs players can open: localhost for this PC, then one per external IPv4 address for others on the
 * same network. Real adapters come first, because the first one becomes the invite link; link-local
 * (169.254.x.x) addresses are skipped since no other device can use them.
 */
export function joinUrls(port: number, interfaces: NodeJS.Dict<os.NetworkInterfaceInfo[]>): string[] {
  const lan = Object.entries(interfaces)
    .flatMap(([name, nics]) => (nics ?? []).map((nic) => ({ name, nic })))
    .filter(({ nic }) => nic.family === 'IPv4' && !nic.internal && !nic.address.startsWith('169.254.'))
    .map(({ name, nic }, order) => ({ url: `http://${nic.address}:${port}`, rank: VIRTUAL.test(name) ? 1 : 0, order }))
    .sort((a, b) => a.rank - b.rank || a.order - b.order)
    .map((x) => x.url);
  return [`http://localhost:${port}`, ...lan];
}
