import fs from 'fs';
import path from 'path';
import { CATEGORIES } from '../src/utils/format';

function sourceText(root: string): string {
  return fs.readdirSync(root, { withFileTypes: true }).map(entry => {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) return sourceText(target);
    return /\.(ts|tsx)$/.test(entry.name) ? fs.readFileSync(target, 'utf8') : '';
  }).join('\n');
}

describe('project integrity', () => {
  const appSource = sourceText(path.join(process.cwd(), 'app'));
  const srcSource = sourceText(path.join(process.cwd(), 'src'));
  const schema = fs.readFileSync(path.join(process.cwd(), 'scripts', '01_schema.sql'), 'utf8');

  it('does not ship fabricated place seed data or third-party fallback photos', () => {
    // The staging-only RLS verification script intentionally creates temporary
    // fixtures inside a transaction and always rolls them back. The production
    // schema itself must never contain fabricated destination data.
    expect(schema).not.toContain('INSERT INTO public.places');
    expect(appSource + srcSource).not.toMatch(/images\.unsplash\.com/i);
  });

  it('keeps the editor category taxonomy aligned with the database', () => {
    const match = schema.match(/category\s+TEXT NOT NULL CHECK \(category IN \(([^)]+)\)\)/);
    expect(match).not.toBeNull();
    const databaseCategories = match![1].match(/'([^']+)'/g)!.map(value => value.slice(1, -1)).sort();
    expect(CATEGORIES.map(category => category.id).sort()).toEqual(databaseCategories);
  });

  it('does not add artificial optimizer delays', () => {
    expect(srcSource).not.toMatch(/simulate api delay/i);
  });
});
