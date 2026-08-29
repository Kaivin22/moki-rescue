import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { BrandColors, Colors } from '../src/constants/colors';

function luminance(hex: string) {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const linear = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrast(foreground: string, background: string) {
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function collectFiles(directory: string, extension: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(target, extension);
    return entry.name.endsWith(extension) ? [target] : [];
  });
}

describe('Moki Rescue design system', () => {
  it('keeps the approved brand primitives exact', () => {
    expect(BrandColors).toEqual({
      canvas: '#F7FBFD',
      ink: '#282E30',
      blue: '#92C5FD',
      lime: '#DDF186',
    });
  });

  it.each([
    ['primary text on page', Colors.textPrimary, Colors.background],
    ['secondary text on page', Colors.textSecondary, Colors.background],
    ['muted text on page', Colors.textMuted, Colors.background],
    ['link and focus on page', Colors.primary, Colors.background],
    ['rating accent on page', Colors.accentDark, Colors.background],
    ['success text on page', Colors.success, Colors.background],
    ['warning text on page', Colors.warning, Colors.background],
    ['error text on page', Colors.error, Colors.background],
    ['primary text on card', Colors.textPrimary, Colors.cardBg],
    ['secondary text on card', Colors.textSecondary, Colors.cardBg],
    ['muted text on card', Colors.textMuted, Colors.cardBg],
    ['primary text on surface', Colors.textPrimary, Colors.surface],
    ['secondary text on surface', Colors.textSecondary, Colors.surface],
    ['muted text on surface', Colors.textMuted, Colors.surface],
    ['success text on success surface', Colors.success, Colors.successSoft],
    ['warning text on warning surface', Colors.warning, Colors.warningSoft],
    ['error text on error surface', Colors.error, Colors.errorSoft],
    ['light text on dark surface', Colors.white, Colors.primaryDark],
    ['dark text on blue', Colors.textPrimary, Colors.brandBlue],
    ['dark text on lime', Colors.textOnAccent, Colors.accent],
  ])('%s meets WCAG AA text contrast', (_name, foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ['strong border on card', Colors.borderStrong, Colors.cardBg],
    ['focus ring on input surface', Colors.focus, Colors.surface],
  ])('%s meets non-text contrast', (_name, foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(3);
  });

  it('keeps runtime colors in the shared token source', () => {
    const colorPattern = /#[0-9a-f]{3,8}\b|rgba?\(/i;
    const offenders = [
      ...collectFiles(path.join(process.cwd(), 'app'), '.tsx'),
      ...collectFiles(path.join(process.cwd(), 'src'), '.tsx'),
      ...collectFiles(path.join(process.cwd(), 'src'), '.ts'),
    ]
      .filter((file) => !file.endsWith(path.join('src', 'constants', 'colors.ts')))
      .filter((file) => colorPattern.test(fs.readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('does not use the ink primitive as a screen or component background', () => {
    const offenders = [
      ...collectFiles(path.join(process.cwd(), 'app'), '.tsx'),
      ...collectFiles(path.join(process.cwd(), 'src'), '.tsx'),
    ]
      .filter((file) =>
        /backgroundColor:\s*(Colors\.primaryDark|Colors\.textPrimary|BrandColors\.ink)/.test(
          fs.readFileSync(file, 'utf8'),
        ),
      )
      .map((file) => path.relative(process.cwd(), file));
    expect(offenders).toEqual([]);
  });

  it('gives every low-level touch target an explicit role and accessible name', () => {
    const interactiveNames = new Set([
      'Pressable',
      'TouchableOpacity',
      'TouchableHighlight',
      'TouchableWithoutFeedback',
    ]);
    const offenders: string[] = [];
    const files = [
      ...collectFiles(path.join(process.cwd(), 'app'), '.tsx'),
      ...collectFiles(path.join(process.cwd(), 'src'), '.tsx'),
    ];

    for (const file of files) {
      const sourceText = fs.readFileSync(file, 'utf8');
      const source = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const visit = (node: ts.Node) => {
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
          const tag = node.tagName.getText(source);
          if (interactiveNames.has(tag)) {
            const attributes = new Set(
              node.attributes.properties
                .filter(ts.isJsxAttribute)
                .map((attribute) => attribute.name.getText(source)),
            );
            if (!attributes.has('accessibilityRole') || !attributes.has('accessibilityLabel')) {
              const location = source.getLineAndCharacterOfPosition(node.getStart(source));
              offenders.push(`${path.relative(process.cwd(), file)}:${location.line + 1}`);
            }
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }

    expect(offenders).toEqual([]);
  });
});
