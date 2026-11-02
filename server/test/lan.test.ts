import type os from 'node:os';
import { describe, it, expect } from 'vitest';
import { joinUrls } from '../src/lan';

const nic = (address: string, family: 'IPv4' | 'IPv6', internal = false) =>
  ({ address, family, internal }) as os.NetworkInterfaceInfo;

describe('joinUrls', () => {
  it('lists localhost first, then each external IPv4 address', () => {
    const urls = joinUrls(3000, {
      'Loopback Pseudo-Interface 1': [nic('127.0.0.1', 'IPv4', true), nic('::1', 'IPv6', true)],
      'Wi-Fi': [nic('fe80::1', 'IPv6'), nic('192.168.1.20', 'IPv4')],
      Ethernet: [nic('10.0.0.5', 'IPv4')],
    });
    expect(urls).toEqual(['http://localhost:3000', 'http://192.168.1.20:3000', 'http://10.0.0.5:3000']);
  });

  it('puts real home-network adapters first and skips link-local addresses', () => {
    const urls = joinUrls(3000, {
      'vEthernet (WSL)': [nic('172.20.48.1', 'IPv4')],
      'Ethernet 2': [nic('169.254.3.4', 'IPv4')],
      'Wi-Fi': [nic('192.168.1.20', 'IPv4')],
      'NordLynx VPN': [nic('10.5.0.2', 'IPv4')],
    });
    expect(urls).toEqual(['http://localhost:3000', 'http://192.168.1.20:3000', 'http://172.20.48.1:3000', 'http://10.5.0.2:3000']);
  });

  it('returns only localhost when there is no network', () => {
    expect(joinUrls(4000, {})).toEqual(['http://localhost:4000']);
  });
});
