import type os from 'node:os';

/** URLs players can open: localhost for this PC, then one per external IPv4 address for others on the same network. */
export function joinUrls(port: number, interfaces: NodeJS.Dict<os.NetworkInterfaceInfo[]>): string[] {
  const lan = Object.values(interfaces)
    .flat()
    .filter((nic): nic is os.NetworkInterfaceInfo => !!nic && nic.family === 'IPv4' && !nic.internal)
    .map((nic) => `http://${nic.address}:${port}`);
  return [`http://localhost:${port}`, ...lan];
}
