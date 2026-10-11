import fs from 'node:fs';
import path from 'node:path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { generate } = require('../scripts/build-init-sql.cjs');
const read = (name: string) => fs.readFileSync(path.join(process.cwd(), name), 'utf8').replace(/\r\n/g, '\n');
const migration = read('backend/src/main/resources/db/migration/V9__align_demo_service_coverage.sql');
const shopMigration = read(
  'backend/src/main/resources/db/migration/V10__shop_dispatch_and_provider_approval.sql',
);

describe('service coverage wiring (static contracts, not PostgreSQL execution)', () => {
  it('defines the demo coverage envelope without depending on local routing files', () => {
    expect(migration).toContain('NOT the administrative boundary of Da Nang');
    expect(migration).toContain('extensions.ST_MakeEnvelope(108.05, 15.95, 108.34, 16.18, 4326)');
    expect(migration).toContain('latitude BETWEEN 15.95 AND 16.18 AND longitude BETWEEN 108.05 AND 108.34');
    expect(migration).toContain('zone.boundary::extensions.geometry');
    expect(migration).toContain('WHERE zone.is_active');
  });

  it('shares coverage across customer validation, matching and final assignment', () => {
    expect(read('backend/src/main/java/com/danang/motorescue/service/ServiceAreaService.java')).toContain(
      'public.api_is_in_service_area(?, ?)',
    );
    expect(read('backend/src/main/java/com/danang/motorescue/service/DispatchService.java')).toContain(
      'public.api_is_in_service_area(team.base_latitude, team.base_longitude)',
    );
    expect(migration).toContain('OFFER_OUTSIDE_SERVICE_AREA');
    expect(migration).toContain("NEW.status = 'assigned'");
    expect(migration).toContain('NEW.destination_latitude, NEW.destination_longitude');
  });

  it('includes coverage in the complete atomic installer without a separate patch', () => {
    const init = generate();
    expect(init).toContain(migration);
    expect(init).toContain('DATABASE_ALREADY_MANAGED_BY_FLYWAY');
    expect(init).toMatch(/^BEGIN;/m);
    expect(init).toMatch(/^COMMIT;/m);
    expect(migration).not.toMatch(/DROP SCHEMA|UPDATE auth\.|SET status = 'cancelled'/);
  });

  it('keeps the region policy private and stops stale provider readiness', () => {
    expect(migration).toContain('FROM PUBLIC, anon, authenticated');
    expect(migration).toContain('TO motorescue_api');
    expect(migration).toContain('WHERE is_available AND NOT public.api_is_in_service_area');
    expect(shopMigration).toContain('public.api_is_in_service_area(team.base_latitude, team.base_longitude)');
    expect(shopMigration).not.toContain('pm.last_latitude');
    const cleanup = read('src/features/rescue/services/availabilityBackgroundLocation.ts');
    expect(cleanup).toContain('stopLocationUpdatesAsync');
    expect(cleanup).not.toContain('startLocationUpdatesAsync');
    expect(cleanup).not.toContain('requestBackgroundPermissionsAsync');
  });
  it('upgrades shop dispatch atomically and never silently approves existing members', () => {
    expect(generate()).toContain(shopMigration);
    expect(shopMigration).not.toContain("SET status = 'active'");
    expect(shopMigration).not.toMatch(/DROP SCHEMA|UPDATE auth\./);
    expect(shopMigration).toContain("SET status = 'no_provider'");
  });
  it('rechecks the shop origin before publishing an OSRM offer', () => {
    const dispatch = read('backend/src/main/java/com/danang/motorescue/service/DispatchService.java');
    expect(dispatch).toContain('team.base_latitude = ? AND team.base_longitude = ?');
    expect(dispatch).toContain('FOR UPDATE OF pm');
    expect(dispatch).toContain('if (!Boolean.TRUE.equals(offered)) markNoProvider(requestId, false)');
    expect(read('backend/src/main/java/com/danang/motorescue/service/OperatorService.java')).toContain(
      'ORDER BY user_id FOR UPDATE',
    );
  });
});
