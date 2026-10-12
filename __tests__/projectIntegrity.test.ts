import fs from 'node:fs';
import path from 'node:path';

describe('project integrity', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
  const config = fs.readFileSync(path.join(process.cwd(), 'app.config.js'), 'utf8');

  it('keeps the approved SDK 57, React and React Native versions aligned', () => {
    expect(packageJson.dependencies.expo).toMatch(/^~57\.0\.\d+$/);
    expect(packageJson.dependencies['react-native']).toMatch(/^0\.86\.\d+$/);
    expect(packageJson.dependencies.react).toBe('19.2.3');
    expect(packageJson.dependencies['react-dom']).toBe(packageJson.dependencies.react);
    expect(packageJson.dependencies['expo-router']).toMatch(/^~57\.0\.\d+$/);
    expect(packageJson.devDependencies.typescript).toMatch(/^~6\.0\.\d+$/);
    const lock = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package-lock.json'), 'utf8'));
    expect(lock.packages[''].dependencies).toEqual(packageJson.dependencies);
    expect(lock.packages[''].devDependencies).toEqual(packageJson.devDependencies);
    expect(packageJson.engines.node).toBe('^22.13.0 || >=24.3.0');
    const ci = fs.readFileSync(path.join(process.cwd(), '.github', 'workflows', 'ci.yml'), 'utf8');
    expect(ci).toContain("NODE_VERSION: '24.14.x'");
  });

  it('shares the lockfile peer-resolution policy with clean installs and CI', () => {
    const npmrc = fs.readFileSync(path.join(process.cwd(), '.npmrc'), 'utf8');
    expect(npmrc).toMatch(/^legacy-peer-deps=true\s*$/m);
  });

  it('declares TypeScript 6 ambient types and resolves aliases without deprecated baseUrl', () => {
    const tsconfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tsconfig.json'), 'utf8'));
    expect(tsconfig.compilerOptions.baseUrl).toBeUndefined();
    expect(tsconfig.compilerOptions.paths['@/*']).toEqual(['./*']);
    expect(tsconfig.compilerOptions.types).toEqual(expect.arrayContaining(['node', 'jest', 'react']));
    expect(packageJson.devDependencies['@types/node']).toMatch(/^\^24\./);
  });

  it('does not embed server secrets or legacy tourism services', () => {
    expect(config).not.toContain('GEMINI_API_KEY');
    expect(config).not.toContain('WEATHER_API');
    expect(config).not.toContain('routingBaseUrls');
    const assistantClient = fs.readFileSync(
      path.join(process.cwd(), 'src', 'features', 'assistant', 'api', 'assistantApi.ts'),
      'utf8',
    );
    expect(assistantClient).not.toContain('generativelanguage.googleapis.com');
    expect(assistantClient).toContain("'/api/assistant/message'");
    const pushRegistration = fs.readFileSync(
      path.join(process.cwd(), 'src', 'features', 'notifications', 'pushNotifications.ts'),
      'utf8',
    );
    expect(pushRegistration).toContain('installationId');
    expect(pushRegistration).toContain('addPushTokenListener');
    expect(pushRegistration).toContain('startPushNotificationSync');
    expect(pushRegistration).toContain('IosAuthorizationStatus.PROVISIONAL');
    expect(pushRegistration).not.toContain('.catch(() => undefined)');
  });

  it('uses the new backend artifact and product identity', () => {
    expect(packageJson.name).toBe('moki-rescue');
    expect(packageJson.scripts['dev:backend']).toBe('node scripts/start-development.cjs --backend');
    expect(fs.readFileSync(path.join(process.cwd(), 'scripts/start-development.cjs'), 'utf8')).toContain(
      'moki-rescue-0.0.1-SNAPSHOT.jar',
    );
    expect(config).toContain("name: 'Moki Rescue'");
    expect(config).toContain("slug: 'moki-rescue'");
    expect(config).toContain("['EXPO_PUBLIC_EAS_PROJECT_ID', easProjectId]");
    expect(config).toContain('Production Supabase and API URLs must use HTTPS');
  });

  it('uses Moki Rescue assets and keeps one CI workflow', () => {
    expect(fs.existsSync(path.join(process.cwd(), 'assets', 'branding', 'moki-rescue-logo.png'))).toBe(true);
    expect(
      fs.existsSync(path.join(process.cwd(), 'assets', 'branding', 'moki-rescue-notification-icon.png')),
    ).toBe(true);
    expect(config).toContain("icon: './assets/branding/moki-rescue-logo.png'");
    expect(fs.existsSync(path.join(process.cwd(), 'logo'))).toBe(false);
    expect(fs.existsSync(path.join(process.cwd(), 'assets', 'motorescue-icon-brand.png'))).toBe(false);
    expect(fs.existsSync(path.join(process.cwd(), 'assets', 'images', 'danang_city_panorama.jpg'))).toBe(
      false,
    );
    const workflows = fs
      .readdirSync(path.join(process.cwd(), '.github', 'workflows'))
      .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'));
    expect(workflows).toEqual(['ci.yml']);
  });

  it('keeps the web resolver scoped to the incompatible Zustand entry', () => {
    const metroConfig = fs.readFileSync(path.join(process.cwd(), 'metro.config.js'), 'utf8');
    expect(metroConfig).toContain("platform === 'web'");
    expect(metroConfig).toContain("moduleName === 'zustand/middleware'");
    expect(metroConfig).toContain("path.join(zustandRoot, 'middleware.js')");
    expect(metroConfig).not.toContain('unstable_enablePackageExports = false');
  });

  it('guards authenticated route groups', () => {
    for (const layout of [
      'app/(tabs)/_layout.tsx',
      'app/rescue/_layout.tsx',
      'app/operator/_layout.tsx',
      'app/profile/_layout.tsx',
      'app/service/_layout.tsx',
      'app/help/_layout.tsx',
    ]) {
      const source = fs.readFileSync(path.join(process.cwd(), layout), 'utf8');
      expect(source).toContain('<Redirect');
    }
  });

  it('requires map confirmation and scopes provider contact to active cases', () => {
    const requestScreen = fs.readFileSync(path.join(process.cwd(), 'app', '(tabs)', 'request.tsx'), 'utf8');
    const rescueQueryService = fs.readFileSync(
      path.join(
        process.cwd(),
        'backend',
        'src',
        'main',
        'java',
        'com',
        'danang',
        'motorescue',
        'service',
        'RescueQueryService.java',
      ),
      'utf8',
    );
    expect(requestScreen).toContain('<MapView');
    expect(requestScreen).toContain('draggable');
    expect(requestScreen).toContain('selectCoordinate');
    expect(rescueQueryService).toContain('isTrackable(row.status()) ? row.providerContactPhone() : null');
  });

  it('keeps the Figma inventory synchronized with the route tree', () => {
    const collectRoutes = (directory: string): string[] =>
      fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) return collectRoutes(fullPath);
        return entry.name.endsWith('.tsx') && entry.name !== '_layout.tsx' ? [fullPath] : [];
      });
    const routes = collectRoutes(path.join(process.cwd(), 'app'));
    const inventory = fs.readFileSync(path.join(process.cwd(), 'docs', 'FIGMA_SCREEN_INVENTORY.md'), 'utf8');
    // Keep the minimum UI scope and documentation in sync without freezing the route count.
    expect(routes.length - 2).toBeGreaterThanOrEqual(48);
    expect(inventory).toContain(`**${routes.length} màn hình ở cấp mã nguồn**`);
    expect(inventory).toContain(`**${routes.length - 2} màn hình điều hướng thực tế**`);
    for (const section of ['reviews', 'incidents', 'quality-alerts']) {
      expect(inventory).toContain(`/operator/${section}/[id]`);
    }
  });

  it('keeps the full-screen rescue map on router geometry only', () => {
    const map = fs.readFileSync(path.join(process.cwd(), 'app', 'rescue', '[id]', 'map.tsx'), 'utf8');
    expect(map).toContain('useRoadRoute');
    expect(map).toContain('route.data!.coordinates');
    expect(map).not.toContain('coordinates={[{');
    expect(map).toContain('Không dùng đường thẳng');
  });

  it('keeps project specifications synchronized with Moki Rescue', () => {
    const technicalPath = path.join(process.cwd(), 'specs', 'Moki_Rescue_ky_thuat.txt');
    const uiPath = path.join(process.cwd(), 'specs', 'Moki_Rescue_UI_Stitch.txt');
    expect(fs.existsSync(path.join(process.cwd(), 'cuuho.txt'))).toBe(false);
    expect(fs.existsSync(path.join(process.cwd(), 'specs', 'DaNang_RN_ky_thuat.txt'))).toBe(false);
    expect(fs.existsSync(path.join(process.cwd(), 'specs', 'DaNang_RN_UI_Stitch.txt'))).toBe(false);
    const technical = fs.readFileSync(technicalPath, 'utf8');
    const ui = fs.readFileSync(uiPath, 'utf8');
    expect(technical).toContain('ĐẶC TẢ NGHIỆP VỤ VÀ KỸ THUẬT — MOKI RESCUE');
    expect(ui).toContain('CLAUDE DESIGN');
    const collectRoutes = (directory: string): string[] =>
      fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) return collectRoutes(fullPath);
        return entry.name.endsWith('.tsx') && entry.name !== '_layout.tsx' ? [fullPath] : [];
      });
    const routePaths = collectRoutes(path.join(process.cwd(), 'app'))
      .map((file) => path.relative(path.join(process.cwd(), 'app'), file).replace(/\\/g, '/'))
      .filter((file) => !['index.tsx', 'support/incidents/[id].tsx'].includes(file))
      .map((file) => `/${file.replace(/\.tsx$/, '').replace(/\/index$/, '')}`);
    const entries = [...ui.matchAll(/^R(\d{2}) \| (\S+) \| /gm)];
    expect(entries.map((entry) => entry[2]).sort()).toEqual(routePaths.sort());
    expect(entries.map((entry) => Number(entry[1]))).toEqual(entries.map((_, index) => index + 1));
    expect(`${technical}\n${ui}`).not.toContain('Lịch Trình Đà Nẵng');
    expect(fs.existsSync(path.join(process.cwd(), 'docs', 'HARDCODE_AND_MOCK_AUDIT.md'))).toBe(true);
  });

  it('centralizes emergency contacts and configurable provider GPS accuracy', () => {
    const emergency = fs.readFileSync(
      path.join(process.cwd(), 'src', 'features', 'safety', 'emergencyContacts.ts'),
      'utf8',
    );
    const request = fs.readFileSync(path.join(process.cwd(), 'app', '(tabs)', 'request.tsx'), 'utf8');
    const home = fs.readFileSync(path.join(process.cwd(), 'app', '(tabs)', 'index.tsx'), 'utf8');
    const backendConfig = fs.readFileSync(
      path.join(process.cwd(), 'backend', 'src', 'main', 'resources', 'application.yml'),
      'utf8',
    );
    expect(emergency).toContain("number: '115'");
    expect(request).not.toContain("Linking.openURL('tel:");
    expect(home).not.toContain("Linking.openURL('tel:");
    expect(backendConfig).toContain('PROVIDER_LOCATION_MAX_ACCURACY_METERS');
  });

  it('keeps consent versioned and Gemini server-side', () => {
    const access = fs.readFileSync(path.join(process.cwd(), 'src', 'features', 'auth', 'access.ts'), 'utf8');
    const backendConfig = fs.readFileSync(
      path.join(process.cwd(), 'backend', 'src', 'main', 'resources', 'application.yml'),
      'utf8',
    );
    expect(access).toContain('profile.terms_version === LEGAL_VERSION');
    expect(backendConfig).toContain('current-version: ${TERMS_VERSION:2026-08-22}');
    expect(backendConfig).toContain('api-key: ${GEMINI_API_KEY:}');
  });
});

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

  it('keeps brace-expansion outside the three September 2026 advisory ranges', () => {
    const lock = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package-lock.json'), 'utf8'));
    const entries = Object.entries(lock.packages).filter(([name]) => name.endsWith('/brace-expansion'));
    expect(entries.length).toBeGreaterThan(0);
    // GHSA-6j4f-fj2g-mc7p, GHSA-qhr7-859c-m2p7 and GHSA-q2hr-2g5m-vwhr.
    for (const [, dependency] of entries) {
      const [major, minor, patch] = (dependency as { version: string }).version.split('.').map(Number);
      const fixed =
        (major === 1 && (minor > 1 || (minor === 1 && patch >= 21))) ||
        (major === 2 && (minor > 1 || (minor === 1 && patch >= 7))) ||
        (major === 3 && (minor > 0 || patch >= 9)) ||
        (major === 5 && (minor > 0 || patch >= 12)) ||
        major > 5;
      expect(fixed).toBe(true);
    }
  });
});

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
