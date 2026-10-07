import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

function style(file: string, name: string): string {
  const source = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let result = '';
  const visit = (node: ts.Node) => {
    if (
      ts.isPropertyAssignment(node) &&
      node.name.getText(source) === name &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      result = node.initializer.getText(source);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return result;
}

describe('focused login and operator screens', () => {
  it('gives each role a distinct home workflow and guards customer-only requests', () => {
    const home = read('app/(tabs)/index.tsx');
    expect(home).toContain("if (role === 'provider') return <OperationsWorkspace />");
    expect(home).toContain("if (role === 'admin') return <AdminDashboard />");
    expect(home).toContain('return <CustomerHomeScreen />');
    expect(read('app/(tabs)/operations.tsx')).toContain("role !== 'admin'");
    expect(read('app/(tabs)/request.tsx')).toContain("role !== 'customer'");
    const workspace = read('src/features/rescue/screens/OperationsWorkspace.tsx');
    expect(workspace).toContain('disabled={!canToggle}');
    expect(workspace).toContain('if (!canToggle || changing.current) return');
    expect(workspace).toContain('25_000');
  });
  it('keeps login as a method chooser, with separate guarded forms', () => {
    const login = read('app/(auth)/login.tsx');
    expect(login).toContain('/(auth)/sms-login');
    expect(login).toContain('/(auth)/test-login');
    expect(login).not.toContain('<AppInput');
    expect(login).not.toContain('<DevPasswordLoginPanel');
    const sms = read('app/(auth)/sms-login.tsx');
    expect(sms).toContain('signInWithOtp');
    expect(sms).toContain('verifyOtp');
    expect(sms).not.toContain('DevPasswordLoginPanel');
    const testLogin = read('app/(auth)/test-login.tsx');
    expect(testLogin).toContain('canUseDevPasswordLogin(');
    expect(testLogin).toContain('if (!enabled) return <Redirect');
    expect(testLogin).toContain('<DevPasswordLoginPanel');
  });

  it('exposes management destinations without embedding their forms in the menu', () => {
    const menu = read('app/operator/index.tsx');
    for (const destination of ['teams', 'services', 'admins', 'attention', 'audit']) {
      expect(menu).toContain(`/operator/${destination}`);
    }
    expect(menu).not.toContain('<AppInput');
    expect(menu).not.toContain('<ServiceCatalogEditor');
    expect(read('src/features/rescue/screens/OperationsWorkspace.tsx')).toContain("router.push('/operator')");
    expect(read('app/operator/_layout.tsx')).toContain("profile.role !== 'admin'");
  });

  it.each([
    ['teams.tsx', 'teams'],
    ['team-new.tsx', 'create'],
    ['admins.tsx', 'admins'],
    ['team/[id]/index.tsx', 'team'],
    ['team/[id]/providers.tsx', 'providers'],
    ['team/[id]/provider-new.tsx', 'add-provider'],
    ['team/[id]/capabilities.tsx', 'capabilities'],
    ['team/[id]/verification.tsx', 'verification'],
    ['team/[id]/quality.tsx', 'quality'],
  ])('renders %s as its own focused section', (file, section) => {
    expect(read(`app/operator/${file}`)).toContain(`section="${section}"`);
    const implementation = read('src/features/operator/TeamManagementScreen.tsx');
    expect(implementation).toContain(`section === '${section}' ? (`);
    expect(implementation).not.toContain('<ServiceCatalogEditor');
  });

  it('routes from the service list to a code-scoped editor', () => {
    expect(read('app/operator/services.tsx')).toContain("pathname: '/operator/service/[code]'");
    expect(read('app/operator/services.tsx')).not.toContain('<ServiceCatalogEditor');
    expect(read('app/operator/service/[code].tsx')).toContain('serviceCode={code}');
    expect(read('src/features/rescue/components/ServiceCatalogEditor.tsx')).toContain(
      'service.code === serviceCode',
    );
  });

  it('lets long home text wrap while reserving room for the logo', () => {
    const home = 'app/(tabs)/index.tsx';
    expect(read(home)).toContain('<View style={styles.heroText}>');
    expect(style(home, 'heroText')).toMatch(/flex:\s*1/);
    expect(style(home, 'heroText')).toMatch(/minWidth:\s*0/);
    expect(style(home, 'shield')).toMatch(/flexShrink:\s*0/);
    expect(style(home, 'hero')).toContain("alignSelf: 'stretch'");
    expect(style(home, 'emptyText')).toMatch(/flex:\s*1/);
  });
});
