import fs from 'node:fs';
import path from 'node:path';

describe('dependency update compatibility policy', () => {
  const config = fs.readFileSync(path.join(process.cwd(), '.github/dependabot.yml'), 'utf8');
  const npmConfig = config.split('  - package-ecosystem: npm')[1].split('  - package-ecosystem: maven')[0];

  it('keeps automated npm updates inside the approved manifest ranges', () => {
    expect(npmConfig).toMatch(/^\s+versioning-strategy: lockfile-only$/m);
    expect(npmConfig).not.toContain('increase-if-necessary');
    expect(npmConfig).toContain('expo-sdk-patches:');
    expect(npmConfig).not.toContain('expo-sdk-54-patches:');
  });

  it('preserves CI validation for dependency pull requests', () => {
    const workflow = fs.readFileSync(path.join(process.cwd(), '.github/workflows/ci.yml'), 'utf8');
    expect(workflow).toContain('pull_request:');
    expect(workflow).toContain('npm run typecheck');
    expect(workflow).toContain('npx expo install --check');
    expect(workflow).not.toContain('continue-on-error: true');
    expect(workflow).toContain('npm audit --audit-level=critical');
  });

  it('keeps the test dependency outside the Handlebars critical advisory range', () => {
    const lock = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package-lock.json'), 'utf8'));
    // GHSA-8r5x-fm3f-whwj and GHSA-p8wg-vrv2-v86f: fixed in 4.7.10.
    const entries = Object.entries(lock.packages).filter(([name]) => name.endsWith('/handlebars'));
    expect(entries.length).toBeGreaterThan(0);
    for (const [, dependency] of entries) {
      const [major, minor, patch] = (dependency as { version: string }).version.split('.').map(Number);
      expect(major > 4 || (major === 4 && (minor > 7 || (minor === 7 && patch >= 10)))).toBe(true);
    }
  });

  it('pins official CI actions to reviewed commits rather than mutable tags', () => {
    const workflow = fs.readFileSync(path.join(process.cwd(), '.github/workflows/ci.yml'), 'utf8');
    const actions = [...workflow.matchAll(/uses: (actions\/[^@\s]+)@([^\s]+) # ([^\n]+)/g)];
    expect(actions).toHaveLength(4);
    for (const [, , commit, description] of actions) {
      expect(commit).toMatch(/^[a-f0-9]{40}$/);
      expect(description).toContain('(Node 24)');
    }
  });
});
