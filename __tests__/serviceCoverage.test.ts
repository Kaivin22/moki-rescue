import fs from 'node:fs';
import path from 'node:path';
const read = (name: string) => fs.readFileSync(path.join(process.cwd(), name), 'utf8').replace(/\r\n/g, '\n');
const migration = read('backend/src/main/resources/db/migration/V9__align_demo_service_coverage.sql');

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
      'public.api_is_in_service_area(pm.last_latitude, pm.last_longitude)',
    );
    expect(migration).toContain('OFFER_OUTSIDE_SERVICE_AREA');
    expect(migration).toContain("NEW.status = 'assigned'");
    expect(migration).toContain('NEW.destination_latitude, NEW.destination_longitude');
  });

  it('ships an atomic incremental copy without touching auth or cancelling jobs', () => {
    const upgrade = read('scripts/06_upgrade_demo_service_coverage.sql');
    expect(upgrade).toContain(migration);
    expect(upgrade).toContain('V8_PREREQUISITES_MISSING_DO_NOT_RESET');
    expect(upgrade).toContain('DATABASE_MANAGED_BY_FLYWAY_USE_FLYWAY_MIGRATE');
    expect(upgrade).toMatch(/^BEGIN;/m);
    expect(upgrade).toMatch(/^COMMIT;/m);
    expect(upgrade).not.toMatch(/DROP SCHEMA|UPDATE auth\.|SET status = 'cancelled'/);
  });

  it('keeps the region policy private and stops stale provider readiness', () => {
    expect(migration).toContain('FROM PUBLIC, anon, authenticated');
    expect(migration).toContain('TO motorescue_api');
    expect(migration).toContain('WHERE is_available AND NOT public.api_is_in_service_area');
    expect(read('src/features/rescue/hooks/useAvailableProviderLocation.ts')).toContain(
      "error.code === 'PROVIDER_OUTSIDE_SERVICE_AREA'",
    );
    expect(read('src/features/rescue/services/availabilityBackgroundLocation.ts')).toContain(
      "'PROVIDER_OUTSIDE_SERVICE_AREA'",
    );
  });
});
