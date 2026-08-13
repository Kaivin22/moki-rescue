-- ============================================================================
-- DANANG ITINERARY — OPTIONAL CURATED STARTER CATALOG
-- 15 địa điểm thật, đối chiếu lần cuối ngày 2026-08-13.
-- Chạy sau 01_schema.sql. Có thể chạy lại; script không ghi đè bản ghi đã tồn tại.
--
-- Tọa độ và danh tính được đối chiếu từ các URL OpenStreetMap trong
-- source_url (dữ liệu © OpenStreetMap contributors, ODbL). rating_avg để NULL
-- và rating_count để 0 vì chưa có đánh giá nội bộ đã xác minh.
--
-- opening_time/closing_time là khung giờ bảo thủ để lập lịch, không phải
-- cam kết vận hành. Admin cần kiểm tra website/ban quản lý khi giờ thay đổi.
-- Không kèm URL ảnh bên thứ ba; hãy tải media có quyền sử dụng qua Admin.
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.places') IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42P01',
      MESSAGE = 'PLACES_TABLE_NOT_FOUND',
      HINT = 'Run scripts/01_schema.sql before scripts/03_seed_real_places.sql.';
  END IF;
END;
$$;

WITH seed_places (
  id, name, name_en, description, address, city, district, lat, lng,
  category, tags, suitable_for, avg_duration_min,
  opening_time, closing_time, opening_days, tips,
  best_time_of_day, best_months, image_urls, phone, website,
  source_name, source_url, is_active, content_status, last_synced_at
) AS (
  VALUES
    (
      'da000001-0000-4000-8000-000000000001'::UUID,
      'Bảo tàng Điêu khắc Chăm Đà Nẵng', 'Museum of Cham Sculpture',
      'Bảo tàng chuyên về nghệ thuật và di sản điêu khắc Chăm, nằm bên sông Hàn tại trung tâm thành phố.',
      'Số 02 đường 2 Tháng 9, Hải Châu, Đà Nẵng', 'Đà Nẵng', 'Hải Châu',
      16.06012090::DECIMAL, 108.22308400::DECIMAL,
      'museum', ARRAY['history','culture','museum','indoor']::TEXT[], ARRAY['family','couple','solo','friends','elderly']::TEXT[], 120,
      '07:00'::TIME, '17:00'::TIME, ARRAY[1,2,3,4,5,6,7]::INTEGER[],
      'Nên dành từ 90–120 phút; kiểm tra giờ bán vé trên website chính thức trước khi đến.',
      'morning', ARRAY[1,2,3,4,5,6,7,8,9,10,11,12]::INTEGER[], ARRAY[]::TEXT[], NULL::TEXT, 'https://chammuseum.vn/',
      'OpenStreetMap contributors', 'https://www.openstreetmap.org/way/302872188', TRUE, 'published', CURRENT_TIMESTAMP
    ),
    (
      'da000002-0000-4000-8000-000000000002'::UUID,
      'Bảo tàng Đà Nẵng', 'Da Nang Museum',
      'Không gian trưng bày lịch sử, văn hóa và quá trình phát triển của Đà Nẵng trong khu trung tâm thành phố.',
      '42 Bạch Đằng, Hải Châu, Đà Nẵng', 'Đà Nẵng', 'Hải Châu',
      16.07501290::DECIMAL, 108.22393470::DECIMAL,
      'museum', ARRAY['history','culture','museum','indoor']::TEXT[], ARRAY['family','couple','solo','friends','elderly']::TEXT[], 120,
      '08:00'::TIME, '17:00'::TIME, ARRAY[1,2,3,4,5,6,7]::INTEGER[],
      'Giờ tham quan có thể thay đổi theo sự kiện; nên kiểm tra thông báo từ bảo tàng.',
      'morning', ARRAY[1,2,3,4,5,6,7,8,9,10,11,12]::INTEGER[], ARRAY[]::TEXT[], '+84 236 3886 236', 'https://baotangdanang.vn/',
      'OpenStreetMap contributors', 'https://www.openstreetmap.org/way/1368599361', TRUE, 'published', CURRENT_TIMESTAMP
    ),
    (
      'da000003-0000-4000-8000-000000000003'::UUID,
      'Danh thắng Ngũ Hành Sơn', 'Marble Mountains',
      'Quần thể núi đá vôi có hang động, chùa, đài ngắm cảnh và các tuyến bậc thang tham quan.',
      '81 Huyền Trân Công Chúa, Ngũ Hành Sơn, Đà Nẵng', 'Đà Nẵng', 'Ngũ Hành Sơn',
      16.00402000::DECIMAL, 108.26277450::DECIMAL,
      'mountain', ARRAY['mountain','history','culture','adventure','outdoor']::TEXT[], ARRAY['family','couple','solo','friends']::TEXT[], 180,
      '07:00'::TIME, '17:30'::TIME, ARRAY[1,2,3,4,5,6,7]::INTEGER[],
      'Mang giày bám tốt, nước uống và tránh bậc đá trơn khi mưa; kiểm tra giờ quầy vé.',
      'morning', ARRAY[2,3,4,5,6,7,8]::INTEGER[], ARRAY[]::TEXT[], NULL::TEXT, 'https://nguhanhson.org/',
      'OpenStreetMap contributors', 'https://www.openstreetmap.org/relation/8552348', TRUE, 'published', CURRENT_TIMESTAMP
    ),
    (
      'da000004-0000-4000-8000-000000000004'::UUID,
      'Bán đảo Sơn Trà', 'Son Tra Peninsula',
      'Khu bảo tồn thiên nhiên ven biển với đường núi, rừng, các điểm ngắm cảnh và hệ sinh thái đặc trưng.',
      'Bán đảo Sơn Trà, Sơn Trà, Đà Nẵng', 'Đà Nẵng', 'Sơn Trà',
      16.12049000::DECIMAL, 108.26470750::DECIMAL,
      'nature', ARRAY['mountain','nature','adventure','photo','outdoor']::TEXT[], ARRAY['couple','solo','friends']::TEXT[], 240,
      '06:00'::TIME, '18:00'::TIME, ARRAY[1,2,3,4,5,6,7]::INTEGER[],
      'Chỉ đi ban ngày, theo dõi thời tiết và quy định phương tiện/tuyến đường của ban quản lý.',
      'morning', ARRAY[2,3,4,5,6,7,8]::INTEGER[], ARRAY[]::TEXT[], NULL::TEXT, NULL::TEXT,
      'OpenStreetMap contributors', 'https://www.openstreetmap.org/node/1623183634', TRUE, 'published', CURRENT_TIMESTAMP
    ),
    (
      'da000005-0000-4000-8000-000000000005'::UUID,
      'Chùa Linh Ứng Bãi Bụt', 'Linh Ung Pagoda at Bai But',
      'Ngôi chùa Phật giáo trên bán đảo Sơn Trà, có không gian hành lễ và tầm nhìn hướng về thành phố, biển.',
      'Đường Hoàng Sa, Sơn Trà, Đà Nẵng', 'Đà Nẵng', 'Sơn Trà',
      16.10015670::DECIMAL, 108.27841120::DECIMAL,
      'temple', ARRAY['culture','temple','spiritual','viewpoint']::TEXT[], ARRAY['family','couple','solo','friends','elderly']::TEXT[], 90,
      '06:00'::TIME, '21:00'::TIME, ARRAY[1,2,3,4,5,6,7]::INTEGER[],
      'Mặc trang phục lịch sự, giữ yên lặng tại khu hành lễ và không cho khỉ ăn.',
      'morning', ARRAY[1,2,3,4,5,6,7,8,9,10,11,12]::INTEGER[], ARRAY[]::TEXT[], NULL::TEXT, NULL::TEXT,
      'OpenStreetMap contributors', 'https://www.openstreetmap.org/way/486703049', TRUE, 'published', CURRENT_TIMESTAMP
    ),
    (
      'da000006-0000-4000-8000-000000000006'::UUID,
      'Bãi biển Mỹ Khê', 'My Khe Beach',
      'Bãi biển công cộng dọc tuyến Võ Nguyên Giáp, phù hợp tắm biển, đi bộ và ngắm bình minh.',
      'Đường Võ Nguyên Giáp, Sơn Trà, Đà Nẵng', 'Đà Nẵng', 'Sơn Trà',
      16.07562540::DECIMAL, 108.24687840::DECIMAL,
      'beach', ARRAY['beach','relax','photo','family','outdoor']::TEXT[], ARRAY['family','couple','solo','friends','elderly']::TEXT[], 120,
      '05:00'::TIME, '21:00'::TIME, ARRAY[1,2,3,4,5,6,7]::INTEGER[],
      'Chỉ bơi trong khu vực có cờ và nhân viên cứu hộ; tránh xuống nước khi biển động.',
      'morning', ARRAY[3,4,5,6,7,8]::INTEGER[], ARRAY[]::TEXT[], NULL::TEXT, NULL::TEXT,
      'OpenStreetMap contributors', 'https://www.openstreetmap.org/relation/19000664', TRUE, 'published', CURRENT_TIMESTAMP
    ),
    (
      'da000007-0000-4000-8000-000000000007'::UUID,
      'Cầu Rồng', 'Dragon Bridge',
      'Cây cầu bắc qua sông Hàn với kiến trúc hình rồng, là điểm ngắm cảnh đô thị vào buổi tối.',
      'Cầu Rồng, đường Nguyễn Văn Linh, Đà Nẵng', 'Đà Nẵng', 'Hải Châu',
      16.06116820::DECIMAL, 108.22789680::DECIMAL,
      'viewpoint', ARRAY['viewpoint','photo','night','architecture']::TEXT[], ARRAY['family','couple','solo','friends','elderly']::TEXT[], 45,
      '00:00'::TIME, '23:59'::TIME, ARRAY[1,2,3,4,5,6,7]::INTEGER[],
      'Lịch phun lửa, phun nước có thể thay đổi; kiểm tra thông báo giao thông và đứng ở khu vực an toàn.',
      'night', ARRAY[1,2,3,4,5,6,7,8,9,10,11,12]::INTEGER[], ARRAY[]::TEXT[], NULL::TEXT, NULL::TEXT,
      'OpenStreetMap contributors', 'https://www.openstreetmap.org/way/694831926', TRUE, 'published', CURRENT_TIMESTAMP
    ),
    (
      'da000008-0000-4000-8000-000000000008'::UUID,
      'Chợ Hàn', 'Han Market',
      'Chợ truyền thống ở trung tâm Đà Nẵng, kinh doanh thực phẩm, đặc sản, quần áo và hàng lưu niệm.',
      '119 Trần Phú, Hải Châu, Đà Nẵng', 'Đà Nẵng', 'Hải Châu',
      16.06835250::DECIMAL, 108.22428300::DECIMAL,
      'market', ARRAY['market','food','shopping','culture','indoor']::TEXT[], ARRAY['family','couple','solo','friends','elderly']::TEXT[], 90,
      '06:00'::TIME, '19:00'::TIME, ARRAY[1,2,3,4,5,6,7]::INTEGER[],
      'Hỏi giá trước khi mua, bảo quản tư trang và kiểm tra quy định mang thực phẩm khi di chuyển.',
      'morning', ARRAY[1,2,3,4,5,6,7,8,9,10,11,12]::INTEGER[], ARRAY[]::TEXT[], NULL::TEXT, NULL::TEXT,
      'OpenStreetMap contributors', 'https://www.openstreetmap.org/way/204885903', TRUE, 'published', CURRENT_TIMESTAMP
    ),
    (
      'da000009-0000-4000-8000-000000000009'::UUID,
      'Chợ Cồn', 'Con Market',
      'Khu chợ lâu đời nổi tiếng với đặc sản, hàng tiêu dùng và khu ẩm thực đường phố.',
      '290 Hùng Vương, Thanh Khê, Đà Nẵng', 'Đà Nẵng', 'Thanh Khê',
      16.06812750::DECIMAL, 108.21452130::DECIMAL,
      'market', ARRAY['market','food','shopping','culture','indoor']::TEXT[], ARRAY['family','couple','solo','friends']::TEXT[], 120,
      '06:00'::TIME, '19:00'::TIME, ARRAY[1,2,3,4,5,6,7]::INTEGER[],
      'Khu ẩm thực có thể hoạt động theo khung giờ riêng; hỏi giá và chọn quầy niêm yết rõ.',
      'afternoon', ARRAY[1,2,3,4,5,6,7,8,9,10,11,12]::INTEGER[], ARRAY[]::TEXT[], NULL::TEXT, NULL::TEXT,
      'OpenStreetMap contributors', 'https://www.openstreetmap.org/way/204790989', TRUE, 'published', CURRENT_TIMESTAMP
    ),
    (
      'da000010-0000-4000-8000-000000000010'::UUID,
      'Sun World Bà Nà Hills', 'Sun World Ba Na Hills',
      'Khu du lịch trên núi với hệ thống cáp treo, Cầu Vàng, khu vui chơi và các không gian kiến trúc.',
      'Thôn An Sơn, xã Hòa Ninh, Hòa Vang, Đà Nẵng', 'Đà Nẵng', 'Hòa Vang',
      15.99585690::DECIMAL, 107.98907120::DECIMAL,
      'entertainment', ARRAY['entertainment','mountain','family','photo','adventure']::TEXT[], ARRAY['family','couple','solo','friends']::TEXT[], 480,
      '08:00'::TIME, '22:00'::TIME, ARRAY[1,2,3,4,5,6,7]::INTEGER[],
      'Kiểm tra giờ cáp treo, hạng mục bảo trì và thời tiết trên núi trên website trước ngày đi.',
      'morning', ARRAY[2,3,4,5,6,7,8]::INTEGER[], ARRAY[]::TEXT[], NULL::TEXT, 'https://banahills.sunworld.vn/',
      'OpenStreetMap contributors', 'https://www.openstreetmap.org/way/359114064', TRUE, 'published', CURRENT_TIMESTAMP
    ),
    (
      'da000011-0000-4000-8000-000000000011'::UUID,
      'Công viên Suối khoáng nóng Núi Thần Tài', 'Nui Than Tai Hot Spring Park',
      'Khu nghỉ dưỡng suối khoáng nóng và vui chơi dưới nước ở khu vực Hòa Phú, Hòa Vang.',
      'Quốc lộ 14G, Hòa Phú, Hòa Vang, Đà Nẵng', 'Đà Nẵng', 'Hòa Vang',
      15.96812620::DECIMAL, 108.01963010::DECIMAL,
      'wellness', ARRAY['wellness','relax','family','entertainment','nature']::TEXT[], ARRAY['family','couple','solo','friends','elderly']::TEXT[], 360,
      '08:30'::TIME, '17:30'::TIME, ARRAY[1,2,3,4,5,6,7]::INTEGER[],
      'Mang đồ bơi; người có vấn đề tim mạch hoặc thai kỳ nên hỏi nhân viên y tế trước khi ngâm khoáng.',
      'morning', ARRAY[1,2,3,4,5,6,7,8,9,10,11,12]::INTEGER[], ARRAY[]::TEXT[], NULL::TEXT, 'https://nuithantai.vn/',
      'OpenStreetMap contributors', 'https://www.openstreetmap.org/node/5286977425', TRUE, 'published', CURRENT_TIMESTAMP
    ),
    (
      'da000012-0000-4000-8000-000000000012'::UUID,
      'Công viên APEC', 'APEC Park',
      'Không gian công cộng ven sông với mái vòm kiến trúc, cây xanh và khu trưng bày tác phẩm.',
      'Đường 2 Tháng 9, Bình Hiên, Hải Châu, Đà Nẵng', 'Đà Nẵng', 'Hải Châu',
      16.05875320::DECIMAL, 108.22351230::DECIMAL,
      'park', ARRAY['park','architecture','photo','relax','family']::TEXT[], ARRAY['family','couple','solo','friends','elderly']::TEXT[], 60,
      '06:00'::TIME, '22:00'::TIME, ARRAY[1,2,3,4,5,6,7]::INTEGER[],
      'Phù hợp ghép cùng Bảo tàng Chăm; giữ vệ sinh và tuân thủ khu vực hạn chế khi có sự kiện.',
      'evening', ARRAY[1,2,3,4,5,6,7,8,9,10,11,12]::INTEGER[], ARRAY[]::TEXT[], NULL::TEXT, NULL::TEXT,
      'OpenStreetMap contributors', 'https://www.openstreetmap.org/way/675604354', TRUE, 'published', CURRENT_TIMESTAMP
    ),
    (
      'da000013-0000-4000-8000-000000000013'::UUID,
      'Hải Vân Quan', 'Hai Van Gate',
      'Di tích trên đỉnh Đèo Hải Vân, điểm chuyển tiếp giữa Đà Nẵng và Huế với tầm nhìn núi, biển.',
      'Đỉnh Đèo Hải Vân, khu vực giáp ranh Đà Nẵng – Huế', 'Đà Nẵng', 'Liên Chiểu',
      16.18774710::DECIMAL, 108.13129000::DECIMAL,
      'historical', ARRAY['history','viewpoint','mountain','photo','outdoor']::TEXT[], ARRAY['couple','solo','friends']::TEXT[], 90,
      '06:00'::TIME, '18:00'::TIME, ARRAY[1,2,3,4,5,6,7]::INTEGER[],
      'Chỉ đi khi trời sáng và khô ráo; tuyến đèo có sương mù, cua gấp và xe lớn, cần kiểm tra giao thông trước khi khởi hành.',
      'morning', ARRAY[2,3,4,5,6,7,8]::INTEGER[], ARRAY[]::TEXT[], NULL::TEXT, NULL::TEXT,
      'OpenStreetMap contributors', 'https://www.openstreetmap.org/way/466418347', TRUE, 'published', CURRENT_TIMESTAMP
    ),
    (
      'da000014-0000-4000-8000-000000000014'::UUID,
      'Bảo tàng Đồng Đình', 'Dong Dinh Museum',
      'Không gian sưu tầm tư nhân trong khu vườn Sơn Trà, trưng bày cổ vật, mỹ thuật và văn hóa làng chài.',
      'Đường Hoàng Sa, Sơn Trà, Đà Nẵng', 'Đà Nẵng', 'Sơn Trà',
      16.10121260::DECIMAL, 108.27550960::DECIMAL,
      'museum', ARRAY['museum','culture','art','nature','indoor']::TEXT[], ARRAY['family','couple','solo','friends']::TEXT[], 90,
      '08:00'::TIME, '17:00'::TIME, ARRAY[1,2,3,4,5,6,7]::INTEGER[],
      'Lối đi có bậc và nền dốc; kiểm tra giờ đón khách trước khi ghé.',
      'morning', ARRAY[1,2,3,4,5,6,7,8,9,10,11,12]::INTEGER[], ARRAY[]::TEXT[], NULL::TEXT, NULL::TEXT,
      'OpenStreetMap contributors', 'https://www.openstreetmap.org/node/9653941217', TRUE, 'published', CURRENT_TIMESTAMP
    ),
    (
      'da000015-0000-4000-8000-000000000015'::UUID,
      'Nhà thờ Chính tòa Đà Nẵng', 'Da Nang Cathedral',
      'Nhà thờ Công giáo tại trung tâm thành phố, được biết đến với mặt tiền màu hồng và kiến trúc Gothic.',
      '156 Trần Phú, Hải Châu, Đà Nẵng', 'Đà Nẵng', 'Hải Châu',
      16.06668270::DECIMAL, 108.22305840::DECIMAL,
      'historical', ARRAY['history','culture','architecture','spiritual','photo']::TEXT[], ARRAY['family','couple','solo','friends','elderly']::TEXT[], 45,
      '05:00'::TIME, '19:00'::TIME, ARRAY[1,2,3,4,5,6,7]::INTEGER[],
      'Tôn trọng giờ thánh lễ, mặc trang phục lịch sự và không chụp ảnh làm gián đoạn nghi thức.',
      'morning', ARRAY[1,2,3,4,5,6,7,8,9,10,11,12]::INTEGER[], ARRAY[]::TEXT[], NULL::TEXT, NULL::TEXT,
      'OpenStreetMap contributors', 'https://www.openstreetmap.org/way/404714309', TRUE, 'published', CURRENT_TIMESTAMP
    )
)
INSERT INTO public.places (
  id, name, name_en, description, address, city, district, lat, lng,
  category, tags, suitable_for, avg_duration_min,
  opening_time, closing_time, opening_days, tips,
  best_time_of_day, best_months, image_urls, phone, website,
  source_name, source_url, is_active, content_status, last_synced_at
)
SELECT
  id, name, name_en, description, address, city, district, lat, lng,
  category, tags, suitable_for, avg_duration_min,
  opening_time, closing_time, opening_days, tips,
  best_time_of_day, best_months, image_urls, phone, website,
  source_name, source_url, is_active, content_status, last_synced_at
FROM seed_places
ON CONFLICT DO NOTHING;

SELECT count(*) AS curated_places_present
FROM public.places
WHERE source_url IN (
  'https://www.openstreetmap.org/way/302872188',
  'https://www.openstreetmap.org/way/1368599361',
  'https://www.openstreetmap.org/relation/8552348',
  'https://www.openstreetmap.org/node/1623183634',
  'https://www.openstreetmap.org/way/486703049',
  'https://www.openstreetmap.org/relation/19000664',
  'https://www.openstreetmap.org/way/694831926',
  'https://www.openstreetmap.org/way/204885903',
  'https://www.openstreetmap.org/way/204790989',
  'https://www.openstreetmap.org/way/359114064',
  'https://www.openstreetmap.org/node/5286977425',
  'https://www.openstreetmap.org/way/675604354',
  'https://www.openstreetmap.org/way/466418347',
  'https://www.openstreetmap.org/node/9653941217',
  'https://www.openstreetmap.org/way/404714309'
);

COMMIT;
