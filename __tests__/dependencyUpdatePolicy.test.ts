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
  });
});
