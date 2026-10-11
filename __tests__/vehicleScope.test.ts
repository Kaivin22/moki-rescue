import fs from 'node:fs';
import path from 'node:path';
import { useServiceTypes } from '../src/features/rescue/hooks/useRescueQueries';

jest.mock('@tanstack/react-query', () => ({ useQuery: (options: unknown) => options }));
jest.mock('../src/features/rescue/api/rescueApi', () => ({ rescueApi: { serviceTypes: jest.fn() } }));

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('gasoline-only intake with legacy history preserved', () => {
  it('hides the retired service even when the catalog response is stale', () => {
    const query = useServiceTypes() as unknown as {
      select: (services: { code: string }[]) => { code: string }[];
    };
    const input = [{ code: 'flat_tire' }, { code: 'electric_battery' }, { code: 'motorbike_transport' }];
    expect(query.select(input)).toEqual([{ code: 'flat_tire' }, { code: 'motorbike_transport' }]);
    expect(input).toHaveLength(3);
  });

  it('does not offer electric/unknown intake or charging-station destinations', () => {
    const form = read('app/(tabs)/request.tsx');
    expect(form).toContain("vehiclePowerType: 'gasoline' as const");
    expect(form).not.toContain('setPower');
    expect(form).not.toContain('trạm sạc');
    expect(form).toContain('Xe máy điện chưa nằm trong phạm vi phục vụ, kể cả vận chuyển');
  });

  it('retires capabilities without deleting or relabeling old cases', () => {
    const migration = read('backend/src/main/resources/db/migration/V13__gasoline_rescue_scope.sql');
    expect(migration).toContain(
      "UPDATE public.service_types SET is_active = FALSE WHERE code = 'electric_battery'",
    );
    expect(migration).toContain('service_types_gasoline_scope');
    expect(migration).toContain('team_capabilities_gasoline_scope');
    expect(migration).not.toMatch(/DELETE|TRUNCATE|UPDATE public\.rescue_requests/i);
    expect(read('src/types/rescue.ts')).toContain("vehiclePowerType: 'gasoline' | 'electric' | 'unknown'");
    expect(read('scripts/02_seed_demo_teams.sql')).not.toContain('electric_battery');
  });
});
