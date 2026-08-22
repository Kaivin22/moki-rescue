import fs from 'node:fs';
import path from 'node:path';

describe('project integrity', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
  const config = fs.readFileSync(path.join(process.cwd(), 'app.config.js'), 'utf8');

  it('keeps Expo SDK 54 for the current Expo Go workflow', () => {
    expect(packageJson.dependencies.expo).toMatch(/^~54\.0\.\d+$/);
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
    expect(pushRegistration).not.toContain('.catch(() => undefined)');
  });

  it('uses the new backend artifact and product identity', () => {
    expect(packageJson.scripts['dev:backend']).toContain('motorescue-0.0.1-SNAPSHOT.jar');
    expect(config).toContain("name: 'MotoRescue Đà Nẵng'");
    expect(config).toContain("['EXPO_PUBLIC_EAS_PROJECT_ID', easProjectId]");
    expect(config).toContain('Production Supabase and API URLs must use HTTPS');
  });

  it('uses MotoRescue assets and keeps one CI workflow', () => {
    expect(fs.existsSync(path.join(process.cwd(), 'assets', 'motorescue-icon-opaque.png'))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), 'assets', 'motorescue-notification-icon.png'))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), 'assets', 'images', 'danang_city_panorama.jpg'))).toBe(
      false,
    );
    const workflows = fs
      .readdirSync(path.join(process.cwd(), '.github', 'workflows'))
      .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'));
    expect(workflows).toEqual(['ci.yml']);
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
    const rescueService = fs.readFileSync(
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
        'RescueService.java',
      ),
      'utf8',
    );
    expect(requestScreen).toContain('<MapView');
    expect(requestScreen).toContain('draggable');
    expect(requestScreen).toContain('selectCoordinate');
    expect(rescueService).toContain('isTrackable(row.status()) ? row.providerContactPhone() : null');
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
    expect(routes).toHaveLength(21);
    expect(inventory).toContain('**70 frame Figma nghiệp vụ**');
  });

  it('keeps the full-screen rescue map on router geometry only', () => {
    const map = fs.readFileSync(path.join(process.cwd(), 'app', 'rescue', '[id]', 'map.tsx'), 'utf8');
    expect(map).toContain('useRoadRoute');
    expect(map).toContain('route.data!.coordinates');
    expect(map).not.toContain('coordinates={[{');
    expect(map).toContain('Không dùng đường thẳng');
  });

  it('keeps project specifications synchronized with MotoRescue', () => {
    const technicalPath = path.join(process.cwd(), 'specs', 'MotoRescue_ky_thuat.txt');
    const uiPath = path.join(process.cwd(), 'specs', 'MotoRescue_UI_Stitch.txt');
    expect(fs.existsSync(path.join(process.cwd(), 'cuuho.txt'))).toBe(false);
    expect(fs.existsSync(path.join(process.cwd(), 'specs', 'DaNang_RN_ky_thuat.txt'))).toBe(false);
    expect(fs.existsSync(path.join(process.cwd(), 'specs', 'DaNang_RN_UI_Stitch.txt'))).toBe(false);
    const technical = fs.readFileSync(technicalPath, 'utf8');
    const ui = fs.readFileSync(uiPath, 'utf8');
    expect(technical).toContain('ĐẶC TẢ KỸ THUẬT — MOTORESCUE ĐÀ NẴNG');
    expect(ui.match(/^FRAME \d{2} —/gm)).toHaveLength(70);
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
