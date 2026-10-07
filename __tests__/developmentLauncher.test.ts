import fs from 'node:fs';
import path from 'node:path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolveApiUrl, lanAddresses } = require('../scripts/start-development.cjs');

describe('local API launch configuration', () => {
  it('selects the real LAN adapter, not WSL', () => {
    expect(
      lanAddresses({
        'Wi-Fi': [{ family: 'IPv4', internal: false, address: '192.168.1.2' }],
        'vEthernet (WSL)': [{ family: 'IPv4', internal: false, address: '172.27.96.1' }],
      }),
    ).toEqual(['192.168.1.2']);
  });
  it('uses LAN instead of phone localhost', () => {
    expect(resolveApiUrl('', ['192.168.1.2'])).toBe('http://192.168.1.2:8080');
    expect(resolveApiUrl('http://localhost:8088', ['192.168.1.2'])).toBe('http://192.168.1.2:8088');
  });
  it('does not silently replace an explicitly configured remote backend', () => {
    expect(resolveApiUrl('https://api.example.org/api/', ['192.168.1.2'])).toBe('https://api.example.org');
  });
  it('requires explicit selection when multiple networks exist', () => {
    expect(() => resolveApiUrl('', ['192.168.1.2', '10.0.0.2'])).toThrow('ambiguous');
  });
  it('rejects credentials in a client URL', () => {
    expect(() => resolveApiUrl('https://user:secret@example.org', [])).toThrow();
  });
  it('requires readiness and does not start migrations or visible windows', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'scripts/start-development.cjs'), 'utf8');
    expect(source).toContain('/api/health/ready');
    expect(source).toContain("process.env.SPRING_FLYWAY_ENABLED = 'false'");
    expect(source).toContain("'-jar', 'backend/target/moki-rescue-0.0.1-SNAPSHOT.jar'");
    expect(source).not.toContain("'-jar', path.join(root, 'backend/target/moki-rescue-0.0.1-SNAPSHOT.jar')");
    expect(source).toContain('windowsHide: true');
    expect(source).not.toContain('shell: true');
  });
});
