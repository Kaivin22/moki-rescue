import fs from 'node:fs';
import path from 'node:path';

function collectFiles(directory: string, extension: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(fullPath, extension);
    return entry.name.endsWith(extension) ? [fullPath] : [];
  });
}

describe('Vietnamese and English coverage', () => {
  const root = process.cwd();

  it('exposes exactly Vietnamese and English and validates persisted values', () => {
    const source = fs.readFileSync(path.join(root, 'src', 'i18n', 'index.ts'), 'utf8');
    const languageCodes = [...source.matchAll(/code: '(vi|en)'/g)].map((match) => match[1]);
    expect(languageCodes).toEqual(['vi', 'en']);
    expect(source).toContain("export type Language = 'vi' | 'en'");
    expect(source).toContain("return value === 'vi' || value === 'en'");
    expect(source).toContain('defineTranslations');
  });

  it('requires every rendered route to subscribe to the language store', () => {
    const routes = collectFiles(path.join(root, 'app'), '.tsx');
    const missing = routes
      .filter((file) => {
        const source = fs.readFileSync(file, 'utf8');
        const rendersCopy = /<Text|<AppButton|<AppInput|<ScreenHeader/.test(source);
        return rendersCopy && !/useCopy|useI18n|useTranslation|useRescueDetailsCopy/.test(source);
      })
      .map((file) => path.relative(root, file));
    expect(missing).toEqual([]);
  });

  it('localizes native app metadata and location permission prompts in both languages', () => {
    const config = fs.readFileSync(path.join(root, 'app.config.js'), 'utf8');
    expect(config).toContain("vi: './locales/vi.json'");
    expect(config).toContain("en: './locales/en.json'");
    for (const language of ['vi', 'en']) {
      const locale = JSON.parse(fs.readFileSync(path.join(root, 'locales', `${language}.json`), 'utf8'));
      expect(locale.CFBundleDisplayName).toBe('Moki Rescue');
      expect(locale.NSLocationWhenInUseUsageDescription).toBeTruthy();
      expect(locale.NSLocationAlwaysAndWhenInUseUsageDescription).toBeTruthy();
      expect(locale.android.app_name).toBe('Moki Rescue');
    }
  });

  it('has an English client message for every explicit backend API error code', () => {
    const javaSources = collectFiles(path.join(root, 'backend', 'src', 'main', 'java'), '.java')
      .map((file) => fs.readFileSync(file, 'utf8'))
      .join('\n');
    const backendCodes = new Set(
      [...javaSources.matchAll(/new ApiException\([\s\S]{0,180}?"([A-Z][A-Z0-9_]{2,})"/g)].map(
        (match) => match[1],
      ),
    );
    const client = fs.readFileSync(path.join(root, 'src', 'features', 'rescue', 'api', 'client.ts'), 'utf8');
    const mappedCodes = new Set([...client.matchAll(/^\s{2}([A-Z][A-Z0-9_]+):/gm)].map((match) => match[1]));
    expect([...backendCodes].filter((code) => !mappedCodes.has(code)).sort()).toEqual([]);
  });
});
