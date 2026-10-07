-- DỮ LIỆU GIẢ LẬP: chỉ chạy trên local/staging dành cho demo, sau B1..V8 và 02.
-- 12 vị trí giả lập phân bố trong vùng dữ liệu OSRM demo ở Đà Nẵng.
-- Không phải địa chỉ/đơn vị cứu hộ thực tế; chưa chứng minh điểm nào cũng snap được vào đường.
-- Schema bắt buộc hotline E.164: dùng +1 202 555-0101..0112 thuộc dải hư cấu
-- 555-0100..0199 (https://nanpa.com/numbering/555-line-numbers), KHÔNG gọi/SMS/OTP.
-- Không tạo auth.users, cứu hộ viên, ca, lịch sử kinh nghiệm hoặc xác minh giả.
-- Chạy lại không tạo trùng và không ghi đè đội/năng lực đã được admin chỉnh.

BEGIN;

DO $$
DECLARE
  deployment_environment CONSTANT TEXT := 'CHANGE_ME'; -- sửa thành 'local' hoặc 'staging'
  sample RECORD;
  new_team_id UUID;
  created_count INTEGER := 0;
BEGIN
  IF deployment_environment NOT IN ('local', 'staging') THEN
    RAISE EXCEPTION 'DEMO_SEED_ENVIRONMENT_NOT_CONFIRMED';
  END IF;
  IF to_regclass('public.provider_dispatch_stats') IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'rescue_requests'
        AND column_name = 'assigned_provider_position_at'
    ) THEN
    RAISE EXCEPTION 'RUN_MIGRATIONS_THROUGH_V8_FIRST';
  END IF;

  FOR sample IN SELECT * FROM (VALUES
    ('DEMO-DN-01', '[DEMO] Đội 01 - khu vực trung tâm Hải Châu', 16.0610, 108.2238, 8.0, '+12025550101', ARRAY['flat_tire', 'dead_battery', 'minor_repair']),
    ('DEMO-DN-02', '[DEMO] Đội 02 - khu vực Thuận Phước', 16.0900, 108.2180, 10.0, '+12025550102', ARRAY['flat_tire', 'out_of_fuel', 'motorbike_transport']),
    ('DEMO-DN-03', '[DEMO] Đội 03 - khu vực Thanh Khê', 16.0640, 108.1870, 9.0, '+12025550103', ARRAY['flat_tire', 'dead_battery', 'out_of_fuel']),
    ('DEMO-DN-04', '[DEMO] Đội 04 - khu vực Xuân Hà', 16.0780, 108.1810, 9.0, '+12025550104', ARRAY['flat_tire', 'minor_repair', 'motorbike_transport']),
    ('DEMO-DN-05', '[DEMO] Đội 05 - khu vực Hòa Khánh', 16.0730, 108.1500, 12.0, '+12025550105', ARRAY['flat_tire', 'dead_battery', 'electric_battery']),
    ('DEMO-DN-06', '[DEMO] Đội 06 - khu vực Hòa Hiệp', 16.1160, 108.1240, 14.0, '+12025550106', ARRAY['out_of_fuel', 'electric_battery', 'motorbike_transport']),
    ('DEMO-DN-07', '[DEMO] Đội 07 - khu vực An Hải', 16.0650, 108.2400, 8.0, '+12025550107', ARRAY['flat_tire', 'dead_battery', 'minor_repair']),
    ('DEMO-DN-08', '[DEMO] Đội 08 - khu vực Thọ Quang', 16.1050, 108.2530, 12.0, '+12025550108', ARRAY['out_of_fuel', 'minor_repair', 'motorbike_transport']),
    ('DEMO-DN-09', '[DEMO] Đội 09 - khu vực Mỹ An', 16.0410, 108.2450, 8.0, '+12025550109', ARRAY['flat_tire', 'electric_battery', 'motorbike_transport']),
    ('DEMO-DN-10', '[DEMO] Đội 10 - khu vực Khuê Mỹ', 16.0160, 108.2540, 10.0, '+12025550110', ARRAY['dead_battery', 'minor_repair', 'motorbike_transport']),
    ('DEMO-DN-11', '[DEMO] Đội 11 - khu vực Hòa Xuân', 16.0060, 108.2250, 11.0, '+12025550111', ARRAY['flat_tire', 'out_of_fuel', 'electric_battery']),
    ('DEMO-DN-12', '[DEMO] Đội 12 - khu vực Hòa Cầm', 16.0130, 108.1800, 12.0, '+12025550112', ARRAY['flat_tire', 'dead_battery', 'motorbike_transport'])
  ) AS data(partner_reference, name, latitude, longitude, radius_km, hotline, services)
  LOOP
    new_team_id := NULL;
    INSERT INTO public.rescue_teams
      (name, partner_reference, status, hotline, base_latitude, base_longitude, service_radius_km)
    VALUES (sample.name, sample.partner_reference, 'pending', sample.hotline,
            sample.latitude, sample.longitude, sample.radius_km)
    ON CONFLICT (partner_reference) DO NOTHING
    RETURNING id INTO new_team_id;

    IF new_team_id IS NOT NULL THEN
      INSERT INTO public.team_capabilities(team_id, service_code)
      SELECT new_team_id, service_code FROM unnest(sample.services) AS service(service_code);
      INSERT INTO public.team_verification_checks(team_id, requirement_code, completed, note)
      SELECT new_team_id, code, FALSE, 'Dữ liệu demo; chưa xác minh đối tác hoặc hotline thực tế.'
      FROM public.team_verification_requirements WHERE is_active;
      created_count := created_count + 1;
    END IF;
  END LOOP;
  RAISE NOTICE 'Created % demo teams; existing references left unchanged.', created_count;
END;
$$;

COMMIT;

SELECT partner_reference, name, status, base_latitude, base_longitude, service_radius_km
FROM public.rescue_teams
WHERE partner_reference IN ('DEMO-DN-01', 'DEMO-DN-02', 'DEMO-DN-03', 'DEMO-DN-04',
                           'DEMO-DN-05', 'DEMO-DN-06', 'DEMO-DN-07', 'DEMO-DN-08',
                           'DEMO-DN-09', 'DEMO-DN-10', 'DEMO-DN-11', 'DEMO-DN-12')
ORDER BY partner_reference;
