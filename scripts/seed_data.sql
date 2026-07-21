-- SEED DATA - 60+ Địa điểm Đà Nẵng & Hội An
-- Dành cho hệ thống DaNang Itinerary Planner

-- Xóa dữ liệu cũ nếu có
TRUNCATE TABLE public.places CASCADE;

-- Insert 60+ địa điểm
INSERT INTO public.places (
  name, name_en, description, address, city, district, lat, lng, category, 
  tags, suitable_for, entry_fee_min, entry_fee_max, avg_duration_min, 
  opening_time, closing_time, tips, best_time_of_day, image_urls, rating_avg, rating_count
) VALUES
-- ── BEACHES (Bãi biển) ────────────────────────────────────────────────────────
(
  'Bãi biển Mỹ Khê', 'My Khe Beach', 
  'Một trong những bãi biển quyến rũ nhất hành tinh với cát trắng mịn, sóng hiền hòa và nước ấm quanh năm.', 
  'Đường Võ Nguyên Giáp, Phước Mỹ, Sơn Trà, Đà Nẵng', 'Đà Nẵng', 'Sơn Trà', 
  16.06090000, 108.24580000, 'beach', 
  ARRAY['biển', 'tắm biển', 'check-in', 'hải sản'], ARRAY['gia đình', 'cặp đôi', 'bạn bè', 'solo'], 
  0, 0, 120, '00:00:00', '23:59:59', 
  'Nên đi vào sáng sớm để ngắm bình minh hoặc sau 16h30 để tránh nắng gắt.', 'afternoon', 
  ARRAY['https://images.unsplash.com/photo-1507525428034-b723cf961d3e'], 4.8, 12500
),
(
  'Bãi biển Non Nước', 'Non Nuoc Beach', 
  'Bãi biển hoang sơ, yên bình nằm dưới chân núi Ngũ Hành Sơn với bờ cát dài lộng gió.', 
  'Đường Trường Sa, Hòa Hải, Ngũ Hành Sơn, Đà Nẵng', 'Đà Nẵng', 'Ngũ Hành Sơn', 
  16.01520000, 108.27580000, 'beach', 
  ARRAY['yên bình', 'biển', 'nghỉ dưỡng'], ARRAY['gia đình', 'cặp đôi', 'người cao tuổi'], 
  0, 0, 90, '00:00:00', '23:59:59', 
  'Rất thích hợp để dạo biển ngắm cảnh và thư giãn tránh xa sự ồn ào.', 'afternoon', 
  ARRAY['https://images.unsplash.com/photo-1519046904884-53103b34b206'], 4.5, 3200
),
(
  'Bãi Bụt', 'But Beach', 
  'Bãi biển hoang sơ tuyệt đẹp nằm nép mình bên bán đảo Sơn Trà, nước trong vắt nhìn thấy san hô.', 
  'Bán đảo Sơn Trà, Thọ Quang, Sơn Trà, Đà Nẵng', 'Đà Nẵng', 'Sơn Trà', 
  16.11300000, 108.26780000, 'beach', 
  ARRAY['hoang sơ', 'lặn san hô', 'cắm trại'], ARRAY['bạn bè', 'cặp đôi', 'solo'], 
  0, 0, 150, '06:00:00', '18:00:00', 
  'Có thể thuê chòi sạp ăn uống và mang theo kính lặn để ngắm san hô nông sát bờ.', 'morning', 
  ARRAY['https://images.unsplash.com/photo-1506929562872-bb421503ef21'], 4.4, 1800
),
(
  'Bãi Nam Sơn Trà', 'South Beach Son Tra', 
  'Nơi lý tưởng để lặn ngắm san hô và ngắm nhìn toàn cảnh thành phố Đà Nẵng từ xa.', 
  'Đường Hoàng Sa, Thọ Quang, Sơn Trà, Đà Nẵng', 'Đà Nẵng', 'Sơn Trà', 
  16.12150000, 108.27850000, 'beach', 
  ARRAY['lặn san hô', 'du thuyền', 'hải sản'], ARRAY['bạn bè', 'cặp đôi'], 
  0, 0, 120, '06:00:00', '18:00:00', 
  'Có dịch vụ đi cano cao tốc lặn ngắm san hô rất chuyên nghiệp.', 'morning', 
  ARRAY['https://images.unsplash.com/photo-1544735716-392fe2489ffa'], 4.3, 950
),
(
  'Bãi Bắc Sơn Trà', 'North Beach Son Tra', 
  'Bãi biển cao cấp nằm ở phía bắc bán đảo Sơn Trà, nơi có khu nghỉ dưỡng InterContinental danh tiếng.', 
  'Bán đảo Sơn Trà, Thọ Quang, Sơn Trà, Đà Nẵng', 'Đà Nẵng', 'Sơn Trà', 
  16.13920000, 108.26420000, 'beach', 
  ARRAY['sang trọng', 'nghỉ dưỡng', 'riêng tư'], ARRAY['cặp đôi', 'gia đình'], 
  0, 0, 180, '00:00:00', '23:59:59', 
  'Đa số diện tích thuộc resort quản lý, bạn có thể ghé ăn tối hoặc đặt phòng nghỉ dưỡng.', 'anytime', 
  ARRAY['https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9'], 4.7, 520
),
(
  'Bãi biển An Bàng', 'An Bang Beach', 
  'Top bãi biển đẹp nhất châu Á tại Hội An, mang nét bình dị, tĩnh lặng cùng những quán pub bên bờ biển đầy phong cách.', 
  'Đường Hai Bà Trưng, Cẩm An, Hội An, Quảng Nam', 'Quảng Nam', 'Hội An', 
  15.90150000, 108.34250000, 'beach', 
  ARRAY['thư giãn', 'quán pub', 'nước trong', 'check-in'], ARRAY['solo', 'bạn bè', 'cặp đôi'], 
  0, 0, 180, '00:00:00', '23:59:59', 
  'Hãy chọn các quán pub sát biển, uống nước dừa và nằm võng đọc sách thư giãn.', 'afternoon', 
  ARRAY['https://images.unsplash.com/photo-1504280390367-361c6d9f38f4'], 4.6, 6800
),
(
  'Bãi biển Cửa Đại', 'Cua Dai Beach', 
  'Bãi biển đẹp thơ mộng với những rặng dừa xanh mướt, nơi giao hòa giữa 3 dòng sông Thu Bồn, Trường Giang và Đế Võng.', 
  'Đường Cửa Đại, Cẩm An, Hội An, Quảng Nam', 'Quảng Nam', 'Hội An', 
  15.88250000, 108.37520000, 'beach', 
  ARRAY['dừa xanh', 'yên bình', 'hoàng hôn'], ARRAY['gia đình', 'người cao tuổi'], 
  0, 0, 90, '00:00:00', '23:59:59', 
  'Đến đây ngắm hoàng hôn và thưởng thức hải sản tươi sống giá mềm bên bờ biển.', 'afternoon', 
  ARRAY['https://images.unsplash.com/photo-1473116763269-255448993f66'], 4.2, 2900
),

-- ── MOUNTAIN & NATURE (Núi và Thiên nhiên) ───────────────────────────────────
(
  'Đỉnh Bà Nà Hills', 'Ba Na Hills Peak', 
  'Khu du lịch sinh thái nghỉ dưỡng phức hợp hàng đầu Việt Nam trên độ cao 1,487m với khí hậu ôn đới 4 mùa trong ngày.', 
  'Thôn An Sơn, Hòa Ninh, Hòa Vang, Đà Nẵng', 'Đà Nẵng', 'Hòa Vang', 
  15.99840000, 107.98810000, 'mountain', 
  ARRAY['cáp treo', 'làng pháp', 'núi chúa', 'sương mù'], ARRAY['gia đình', 'cặp đôi', 'bạn bè'], 
  1250000, 1500000, 360, '07:30:00', '22:00:00', 
  'Mua vé cáp treo online trước để tránh xếp hàng dài. Mang theo áo khoác nhẹ vì trên đỉnh núi khá se lạnh.', 'morning', 
  ARRAY['https://images.unsplash.com/photo-1590001155093-a3c66ab0c3ff'], 4.7, 24500
),
(
  'Ngũ Hành Sơn', 'Marble Mountains', 
  'Quần thể gồm 5 ngọn núi đá vôi nhô lên giữa cồn cát ven biển, chứa đựng nhiều hang động huyền bí và chùa cổ cổ kính.', 
  '81 Huyền Trân Công Chúa, Hòa Hải, Ngũ Hành Sơn, Đà Nẵng', 'Đà Nẵng', 'Ngũ Hành Sơn', 
  16.00280000, 108.26380000, 'mountain', 
  ARRAY['hang động', 'chùa cổ', 'leo núi', 'tâm linh'], ARRAY['gia đình', 'solo', 'bạn bè', 'người cao tuổi'], 
  40000, 40000, 150, '07:00:00', '17:30:00', 
  'Nên mua vé thang máy lên đỉnh Thủy Sơn để đỡ mất sức leo dốc cao.', 'morning', 
  ARRAY['https://images.unsplash.com/photo-1599806112354-67f8b5425a06'], 4.6, 14200
),
(
  'Bán đảo Sơn Trà', 'Son Tra Peninsula', 
  'Lá phổi xanh của Đà Nẵng với hệ sinh thái rừng già nguyên sinh đa dạng và loài voọc chà vá chân nâu quý hiếm.', 
  'Phường Thọ Quang, Sơn Trà, Đà Nẵng', 'Đà Nẵng', 'Sơn Trà', 
  16.12050000, 108.26120000, 'nature', 
  ARRAY['rừng nguyên sinh', 'phượt xe máy', 'voọc chà vá', 'thiên nhiên'], ARRAY['solo', 'bạn bè'], 
  0, 0, 180, '00:00:00', '23:59:59', 
  'Chỉ cho phép đi xe máy số hoặc xe tay côn để đảm bảo an toàn khi xuống dốc.', 'morning', 
  ARRAY['https://images.unsplash.com/photo-1441974231531-c6227db76b6e'], 4.8, 8900
),
(
  'Đỉnh Bàn Cờ', 'Ban Co Peak', 
  'Điểm cao nhất trên bán đảo Sơn Trà, nơi có bức tượng Đế Thích ngồi đánh cờ, view ngắm toàn cảnh thành phố.', 
  'Đỉnh núi Sơn Trà, Thọ Quang, Sơn Trà, Đà Nẵng', 'Đà Nẵng', 'Sơn Trà', 
  16.12180000, 108.24350000, 'viewpoint', 
  ARRAY['ngắm cảnh', 'bàn cờ', 'hoàng hôn', 'sương mù'], ARRAY['solo', 'bạn bè', 'cặp đôi'], 
  0, 0, 60, '06:00:00', '18:00:00', 
  'Thích hợp ngắm bình minh hoặc hoàng hôn, đường dốc quanh co cần tay lái vững.', 'morning', 
  ARRAY['https://images.unsplash.com/photo-1501785888041-af3ef285b470'], 4.5, 4100
),
(
  'Suối Hoa', 'Hoa Stream', 
  'Khu du lịch sinh thái với những dòng suối trong vắt mát rượi, thác nước tung bọt trắng xóa và ngập tràn sắc hoa rừng.', 
  'QL14G, Hòa Phú, Hòa Vang, Đà Nẵng', 'Đà Nẵng', 'Hòa Vang', 
  15.96020000, 107.95420000, 'nature', 
  ARRAY['tắm suối', 'hoa rừng', 'dã ngoại'], ARRAY['gia đình', 'bạn bè'], 
  100000, 100000, 240, '08:00:00', '17:00:00', 
  'Nên mang theo quần áo dự phòng để tắm suối và đồ ăn nhẹ để dã ngoại ngoài trời.', 'morning', 
  ARRAY['https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05'], 4.1, 850
),
(
  'Đèo Hải Vân', 'Hai Van Pass', 
  'Một trong những cung đường đèo ven biển đẹp nhất thế giới, nối liền Đà Nẵng và Thừa Thiên Huế.', 
  'Quốc lộ 1A, Hòa Hiệp Bắc, Liên Chiểu, Đà Nẵng', 'Đà Nẵng', 'Liên Chiểu', 
  16.18520000, 108.13120000, 'viewpoint', 
  ARRAY['đèo núi', 'phượt xe máy', 'khúc cua tay áo', 'mây phủ'], ARRAY['solo', 'bạn bè'], 
  0, 0, 90, '00:00:00', '23:59:59', 
  'Dừng chân tại mỏm đá Cây thông cô đơn hoặc các quán cafe dọc đèo để ngắm vịnh Lăng Cô.', 'afternoon', 
  ARRAY['https://images.unsplash.com/photo-1464822759023-fed622ff2c3b'], 4.8, 11500
),
(
  'Rừng dừa Bảy Mẫu', 'Bay Mau Coconut Forest', 
  'Miền Tây thu nhỏ giữa lòng Hội An, nổi tiếng với trải nghiệm đi thuyền thúng len lỏi giữa rừng dừa nước bạt ngàn.', 
  'Võ Chí Công, Cẩm Thanh, Hội An, Quảng Nam', 'Quảng Nam', 'Hội An', 
  15.87520000, 108.36890000, 'nature', 
  ARRAY['thuyền thúng', 'múa thúng', 'dừa nước', 'vui nhộn'], ARRAY['gia đình', 'bạn bè', 'cặp đôi'], 
  30000, 150000, 120, '07:00:00', '17:30:00', 
  'Xem biểu diễn múa thúng xoay vòng tròn cực kỳ kịch tính và thú vị.', 'afternoon', 
  ARRAY['https://images.unsplash.com/photo-1540959733332-eab4deceeaf7'], 4.5, 9300
),

-- ── HISTORICAL & CULTURAL (Di tích và Văn hóa) ────────────────────────────────
(
  'Bảo tàng Điêu khắc Chăm', 'Museum of Cham Sculpture', 
  'Nơi lưu giữ bộ sưu tập hiện vật nghệ thuật điêu khắc Champa quy mô nhất thế giới, nằm bên bờ sông Hàn thơ mộng.', 
  '02 2 Tháng 9, Bình Hiên, Hải Châu, Đà Nẵng', 'Đà Nẵng', 'Hải Châu', 
  16.06120000, 108.22380000, 'museum', 
  ARRAY['lịch sử', 'điêu khắc', 'văn hóa Chăm', 'nghệ thuật'], ARRAY['solo', 'gia đình', 'người cao tuổi'], 
  60000, 60000, 90, '07:30:00', '17:00:00', 
  'Nên thuê hướng dẫn viên hoặc thiết bị audio guide để hiểu sâu hơn về ý nghĩa các bức tượng đất nung và sa thạch.', 'morning', 
  ARRAY['https://images.unsplash.com/photo-1566121318574-df611f7c10b7'], 4.5, 4100
),
(
  'Bảo tàng Đà Nẵng', 'Da Nang Museum', 
  'Không gian trưng bày sống động về lịch sử phát triển, văn hóa dân gian và những cột mốc đấu tranh hào hùng của người dân Đà Nẵng.', 
  '24 Trần Phú, Thạch Thang, Hải Châu, Đà Nẵng', 'Đà Nẵng', 'Hải Châu', 
  16.07950000, 108.22350000, 'museum', 
  ARRAY['lịch sử', 'kháng chiến', 'văn hóa địa phương'], ARRAY['gia đình', 'solo', 'người cao tuổi'], 
  20000, 20000, 60, '08:00:00', '17:00:00', 
  'Nằm trong khuôn viên di tích quốc gia đặc biệt Thành Điện Hải, rất tiện ghé thăm cả hai.', 'morning', 
  ARRAY['https://images.unsplash.com/photo-1601887389937-0b02c26b6c3c'], 4.3, 1200
),
(
  'Thành Điện Hải', 'Dien Hai Citadel', 
  'Pháo đài cổ xây dựng bằng gạch dưới thời vua Gia Long, nhân chứng lịch sử hào hùng trong cuộc kháng chiến chống liên quân Pháp - Tây Ban Nha.', 
  '24 Trần Phú, Thạch Thang, Hải Châu, Đà Nẵng', 'Đà Nẵng', 'Hải Châu', 
  16.08050000, 108.22280000, 'historical', 
  ARRAY['pháo đài cổ', 'lịch sử', 'vua Minh Mạng'], ARRAY['solo', 'người cao tuổi'], 
  0, 0, 45, '08:00:00', '17:00:00', 
  'Chiêm ngưỡng khẩu thần công cổ bằng sắt còn nguyên vẹn trong thành.', 'morning', 
  ARRAY['https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf'], 4.2, 530
),
(
  'Phố cổ Hội An', 'Hoi An Ancient Town', 
  'Di sản Văn hóa Thế giới UNESCO với những ngôi nhà tường vàng mái ngói rêu phong cổ kính, rực rỡ sắc màu đèn lồng mỗi khi đêm về.', 
  'Phường Minh An, Hội An, Quảng Nam', 'Quảng Nam', 'Hội An', 
  15.87710000, 108.32670000, 'historical', 
  ARRAY['nhà cổ', 'đèn lồng', 'sông Hoài', 'di sản', 'ẩm thực'], ARRAY['gia đình', 'cặp đôi', 'bạn bè', 'solo'], 
  120000, 120000, 240, '00:00:00', '23:59:59', 
  'Mua vé tham quan để vào các hội quán, nhà cổ và đi thuyền thả hoa đăng trên sông Hoài lãng mạn.', 'evening', 
  ARRAY['https://images.unsplash.com/photo-1555939594-58d7cb561ad1'], 4.8, 38500
),
(
  'Thánh địa Mỹ Sơn', 'My Son Sanctuary', 
  'Tổ hợp đền tháp Champa cổ nằm ẩn mình trong thung lũng xanh mướt, trung tâm tôn giáo và chính trị của vương quốc cổ xưa.', 
  'Duy Phú, Duy Xuyên, Quảng Nam', 'Quảng Nam', 'Duy Xuyên', 
  15.76280000, 108.11890000, 'historical', 
  ARRAY['đền tháp cổ', 'lịch sử', 'di sản UNESCO', 'champa'], ARRAY['solo', 'người cao tuổi', 'bạn bè'], 
  150000, 150000, 180, '06:00:00', '17:00:00', 
  'Nên đón xem show múa Chăm cổ truyền biểu diễn trực tiếp lúc 9h15 hoặc 14h hàng ngày.', 'morning', 
  ARRAY['https://images.unsplash.com/photo-1549692520-acc6669e2f0c'], 4.6, 9200
),
(
  'Làng gốm Thanh Hà', 'Thanh Ha Pottery Village', 
  'Làng nghề truyền thống hơn 500 tuổi bên dòng sông Thu Bồn, nơi bạn được trực tiếp thử sức chuốt đất sét làm gốm thủ công.', 
  'Đường Duy Tân, Thanh Hà, Hội An, Quảng Nam', 'Quảng Nam', 'Hội An', 
  15.87920000, 108.30520000, 'historical', 
  ARRAY['gốm thủ công', 'làng nghề', 'trải nghiệm làm gốm'], ARRAY['gia đình', 'cặp đôi', 'bạn bè'], 
  35000, 35000, 90, '08:00:00', '17:30:00', 
  'Được tặng một món quà lưu niệm bằng gốm nhỏ xinh khi mua vé vào cổng.', 'afternoon', 
  ARRAY['https://images.unsplash.com/photo-1565192647048-f997ded879ab'], 4.4, 3400
),
(
  'Làng rau Trà Quế', 'Tra Que Vegetable Village', 
  'Trải nghiệm làm nông dân tại làng rau hữu cơ nổi tiếng lâu đời, đạp xe dạo quanh ruộng rau xanh ngát thẳng cánh cò bay.', 
  'Đường Trà Quế, Cẩm Hà, Hội An, Quảng Nam', 'Quảng Nam', 'Hội An', 
  15.89720000, 108.33080000, 'historical', 
  ARRAY['rau hữu cơ', 'làng rau', 'trải nghiệm làm vườn', 'đạp xe'], ARRAY['gia đình', 'cặp đôi', 'bạn bè'], 
  30000, 30000, 90, '08:00:00', '17:00:00', 
  'Thưởng thức đặc sản "Tam Hữu" và nước hạt chia chanh sả tươi mát làm từ rau sạch hái tại vườn.', 'morning', 
  ARRAY['https://images.unsplash.com/photo-1500937386664-56d159dd18d8'], 4.3, 1900
),

-- ── VIEWPOINTS & BRIDGES (Cầu và Điểm ngắm cảnh) ──────────────────────────────
(
  'Cầu Rồng', 'Dragon Bridge', 
  'Biểu tượng tự hào của thành phố Đà Nẵng, có khả năng phun lửa và phun nước sống động vào các tối cuối tuần.', 
  'Đường Nguyễn Văn Linh, An Hải Tây, Sơn Trà, Đà Nẵng', 'Đà Nẵng', 'Sơn Trà', 
  16.06110000, 108.22680000, 'viewpoint', 
  ARRAY['phun lửa', 'phun nước', 'biểu tượng', 'cầu rồng'], ARRAY['gia đình', 'cặp đôi', 'bạn bè', 'solo'], 
  0, 0, 60, '00:00:00', '23:59:59', 
  'Show phun lửa và nước diễn ra lúc 21h00 thứ Sáu, thứ Bảy, Chủ Nhật hàng tuần và các ngày lễ lớn.', 'evening', 
  ARRAY['https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf'], 4.8, 18900
),
(
  'Cầu Tình Yêu', 'Love Bridge', 
  'Nơi treo hàng ngàn ổ khóa khắc tên tình yêu đôi lứa thơ mộng, lấy cảm hứng từ các cầu tình yêu nổi tiếng trên thế giới.', 
  'Đường Trần Hưng Đạo, An Hải Tây, Sơn Trà, Đà Nẵng', 'Đà Nẵng', 'Sơn Trà', 
  16.06150000, 108.22850000, 'viewpoint', 
  ARRAY['khóa tình yêu', 'cá chép hóa rồng', 'lãng mạn', 'check-in'], ARRAY['cặp đôi', 'bạn bè'], 
  0, 0, 45, '00:00:00', '23:59:59', 
  'Buổi tối khi các cây đèn lồng hình trái tim đỏ rực thắp sáng là thời điểm check-in đẹp nhất.', 'evening', 
  ARRAY['https://images.unsplash.com/photo-1518199266791-5375a83190b7'], 4.5, 9600
),
(
  'Cầu Vàng (Golden Bridge)', 'Golden Bridge', 
  'Cây cầu đi bộ nổi tiếng thế giới được nâng đỡ bởi hai bàn tay khổng lồ phủ rêu phong, như dải lụa vàng giữa mây ngàn Bà Nà.', 
  'Sun World Ba Na Hills, Hòa Ninh, Hòa Vang, Đà Nẵng', 'Đà Nẵng', 'Hòa Vang', 
  15.99610000, 107.98920000, 'viewpoint', 
  ARRAY['bàn tay khổng lồ', 'check-in', 'kỳ quan thế giới'], ARRAY['gia đình', 'cặp đôi', 'bạn bè'], 
  0, 0, 60, '07:30:00', '19:00:00', 
  'Nằm trong khuôn viên Bà Nà Hills (cần mua vé cáp treo). Đi tuyến cáp treo sớm nhất để chụp ảnh không dính người.', 'morning', 
  ARRAY['https://images.unsplash.com/photo-1590001155093-a3c66ab0c3ff'], 4.9, 32100
),
(
  'Cầu Sông Hàn', 'Song Han Bridge', 
  'Cây cầu quay đầu tiên và duy nhất do người Việt Nam tự thiết kế và thi công, xoay 90 độ phục vụ giao thương đường thủy.', 
  'Đường Lê Duẩn, An Hải Bắc, Sơn Trà, Đà Nẵng', 'Đà Nẵng', 'Sơn Trà', 
  16.07220000, 108.22550000, 'viewpoint', 
  ARRAY['cầu quay', 'sông Hàn', 'đêm Đà Nẵng'], ARRAY['bạn bè', 'cặp đôi', 'solo'], 
  0, 0, 45, '00:00:00', '23:59:59', 
  'Cầu xoay lúc 23h00 tối thứ Bảy và Chủ Nhật hàng tuần để phục vụ khách du lịch ngắm cảnh.', 'evening', 
  ARRAY['https://images.unsplash.com/photo-1502602898657-3e91760cbb34'], 4.6, 7500
),
(
  'Cầu Thuận Phước', 'Thuan Phuoc Bridge', 
  'Cây cầu treo dây võng dài nhất Việt Nam bắc qua cửa vịnh Đà Nẵng, lộng gió và vô cùng hùng vĩ.', 
  'Cầu Thuận Phước, Nại Hiên Đông, Sơn Trà, Đà Nẵng', 'Đà Nẵng', 'Sơn Trà', 
  16.09650000, 108.22150000, 'viewpoint', 
  ARRAY['cầu treo dây võng', 'cửa biển', 'hoàng hôn hùng vĩ'], ARRAY['solo', 'cặp đôi'], 
  0, 0, 30, '00:00:00', '23:59:59', 
  'Đứng ngắm hoàng hôn buông xuống cửa biển từ chân cầu bên bán đảo Sơn Trà cực kỳ lãng mạn.', 'afternoon', 
  ARRAY['https://images.unsplash.com/photo-1472214222555-d402758b4521'], 4.4, 3800
),
(
  'Cầu Trần Thị Lý', 'Tran Thi Ly Bridge', 
  'Cây cầu có kiến trúc độc đáo hình cánh buồm căng gió vươn khơi xa, rực rỡ sắc màu đổi liên tục về đêm.', 
  'Cầu Trần Thị Lý, Hòa Cường Bắc, Hải Châu, Đà Nẵng', 'Đà Nẵng', 'Hải Châu', 
  16.05050000, 108.23250000, 'viewpoint', 
  ARRAY['hình cánh buồm', 'cầu dây văng', 'sông hàn'], ARRAY['cặp đôi', 'solo'], 
  0, 0, 30, '00:00:00', '23:59:59', 
  'Có lối đi bộ rất rộng, lý tưởng để chụp ảnh phơi sáng đèn xe lung linh.', 'evening', 
  ARRAY['https://images.unsplash.com/photo-1519451241324-20b4ea2c4220'], 4.5, 4900
),

-- ── FOOD & MARKETS (Ăn uống và Chợ) ──────────────────────────────────────────
(
  'Chợ Hàn', 'Han Market', 
  'Chợ truyền thống sầm uất lâu đời nhất thành phố, thiên đường đặc sản mua sắm quà lưu niệm và đồ ăn khô.', 
  '119 Trần Phú, Hải Châu 1, Hải Châu, Đà Nẵng', 'Đà Nẵng', 'Hải Châu', 
  16.06820000, 108.22380000, 'market', 
  ARRAY['chợ truyền thống', 'đặc sản', 'mua sắm', 'bánh tráng cuốn thịt heo'], ARRAY['gia đình', 'solo', 'bạn bè'], 
  0, 0, 90, '06:00:00', '19:00:00', 
  'Nên mặc cả một chút khi mua quà lưu niệm hoặc đồ khô làm quà. Có bán hải sản sấy và mắm nêm cực ngon.', 'morning', 
  ARRAY['https://images.unsplash.com/photo-1533900298318-6b8da08a523e'], 4.4, 15400
),
(
  'Chợ Cồn', 'Con Market', 
  'Thiên đường ẩm thực đường phố Đà Nẵng, hội tụ tất cả đặc sản địa phương với giá siêu bình dân.', 
  '290 Hùng Vương, Vĩnh Trung, Hải Châu, Đà Nẵng', 'Đà Nẵng', 'Hải Châu', 
  16.06890000, 108.21620000, 'market', 
  ARRAY['thiên đường ăn vặt', 'ốc hút', 'mì quảng', 'bánh xèo'], ARRAY['bạn bè', 'solo', 'cặp đôi'], 
  0, 0, 90, '07:00:00', '19:30:00', 
  'Ghé khu ẩm thực trong chợ (Food court) vào tầm chiều 15h00 - 17h00 để ăn vặt đầy đủ món nhất.', 'afternoon', 
  ARRAY['https://images.unsplash.com/photo-1563865436874-9aef32095ffd'], 4.5, 12600
),
(
  'Chợ đêm Sơn Trà', 'Son Tra Night Market', 
  'Chợ đêm sầm uất náo nhiệt bên chân cầu Rồng, nổi tiếng với các quầy hải sản tươi rói nướng tại chỗ.', 
  'Mai Hắc Đế, An Hải Tây, Sơn Trà, Đà Nẵng', 'Đà Nẵng', 'Sơn Trà', 
  16.06120000, 108.22950000, 'market', 
  ARRAY['chợ đêm', 'ăn vặt', 'hải sản nướng', 'quà lưu niệm'], ARRAY['bạn bè', 'cặp đôi'], 
  0, 0, 120, '18:00:00', '23:30:00', 
  'Xem phun lửa cầu Rồng rồi đi bộ sang ăn hải sản nướng và mua quà lưu niệm cực kỳ tiện.', 'evening', 
  ARRAY['https://images.unsplash.com/photo-1555150675-44c11e612fa5'], 4.3, 8500
),
(
  'Chợ đêm Helio', 'Helio Night Market', 
  'Khu chợ ẩm thực đêm được decor hoành tráng, sân khấu ca nhạc live nhạc trẻ sôi động mỗi tối.', 
  'Đường 2 Tháng 9, Hòa Cường Bắc, Hải Châu, Đà Nẵng', 'Đà Nẵng', 'Hải Châu', 
  16.03720000, 108.22480000, 'market', 
  ARRAY['nhạc sống', 'bia & nướng', 'bia craft', 'check-in trẻ trung'], ARRAY['bạn bè', 'cặp đôi'], 
  0, 0, 120, '17:30:00', '22:30:00', 
  'Mua thẻ nạp tiền để thanh toán tại các quầy ẩm thực rất sạch sẽ và văn minh.', 'evening', 
  ARRAY['https://images.unsplash.com/photo-1516450360452-9312f5e86fc7'], 4.5, 6200
),
(
  'Chợ đêm Hội An', 'Hoi An Night Market', 
  'Khu chợ đêm rực rỡ sắc màu đèn lồng bên kia sông Hoài, thế giới của đồ thủ công mỹ nghệ, gốm và ẩm thực xứ Quảng.', 
  'Đường Nguyễn Hoàng, An Hội, Hội An, Quảng Nam', 'Quảng Nam', 'Hội An', 
  15.87550000, 108.32480000, 'market', 
  ARRAY['đèn lồng', 'tò he gốm', 'bánh tráng nướng', 'quà lưu niệm'], ARRAY['gia đình', 'cặp đôi', 'bạn bè'], 
  0, 0, 90, '18:00:00', '23:00:00', 
  'Địa điểm hoàn hảo để mua những chiếc đèn lồng xếp xếp bằng vải lụa tơ tằm mang về làm quà.', 'evening', 
  ARRAY['https://images.unsplash.com/photo-1506543730435-e2c37db2bc40'], 4.6, 11200
),
(
  'Phố ẩm thực Trần Phú (Hội An)', 'Tran Phú Food Street', 
  'Tuyến đường sầm uất quy tụ hàng loạt quán ăn di sản phục vụ Cao Lầu, cơm gà, bánh mì trứ danh lâu đời.', 
  'Đường Trần Phú, Minh An, Hội An, Quảng Nam', 'Quảng Nam', 'Hội An', 
  15.87780000, 108.32890000, 'food', 
  ARRAY['cao lầu', 'cơm gà bà buội', 'ẩm thực truyền thống'], ARRAY['gia đình', 'cặp đôi', 'solo'], 
  30000, 150000, 60, '08:00:00', '22:00:00', 
  'Nên ăn thử món bánh bao bánh vạc trứ danh (White Rose) truyền thống tại đây.', 'anytime', 
  ARRAY['https://images.unsplash.com/photo-1555396273-367ea4eb4db5'], 4.7, 5400
),

-- ── ENTERTAINMENT & PARKS (Giải trí và Công viên) ─────────────────────────────
(
  'Công viên Châu Á (Asia Park)', 'Asia Park', 
  'Tổ hợp giải trí hoành tráng nổi bật với Vòng quay Mặt Trời Sun Wheel khổng lồ, ngắm nhìn Đà Nẵng lung linh về đêm.', 
  '01 Phan Đăng Lưu, Hòa Cường Bắc, Hải Châu, Đà Nẵng', 'Đà Nẵng', 'Hải Châu', 
  16.03920000, 108.22580000, 'entertainment', 
  ARRAY['sun wheel', 'trò chơi cảm giác mạnh', 'công viên văn hóa'], ARRAY['bạn bè', 'gia đình', 'cặp đôi'], 
  0, 200000, 180, '15:00:00', '22:00:00', 
  'Vào cổng tự do chụp ảnh. Chỉ trả tiền vé khi chơi các trò chơi cảm giác mạnh hoặc cabin Vòng quay Mặt trời.', 'evening', 
  ARRAY['https://images.unsplash.com/photo-1513829096960-ef229e5230ab'], 4.5, 9800
),
(
  'Công viên 29 Tháng 3', '29 March Park', 
  'Lá phổi xanh yên bình ngay trung tâm thành phố, hồ nước rộng lớn lộng gió rì rào bóng mát râm ran.', 
  'Đường Điện Biên Phủ, Chính Gián, Thanh Khê, Đà Nẵng', 'Đà Nẵng', 'Thanh Khê', 
  16.06620000, 108.20520000, 'park', 
  ARRAY['yên tĩnh', 'chạy bộ', 'hồ nước', 'bóng cây'], ARRAY['gia đình', 'người cao tuổi', 'solo'], 
  0, 0, 60, '05:00:00', '22:00:00', 
  'Thích hợp đi bộ thư giãn, có khu vui chơi nhỏ cho các gia đình có trẻ em.', 'morning', 
  ARRAY['https://images.unsplash.com/photo-1542362567-b07eac790abc'], 4.2, 1900
),
(
  'VinWonders Nam Hội An', 'VinWonders Nam Hoi An', 
  'Tổ hợp vui chơi giải trí đẳng cấp quốc tế kết hợp bảo tồn văn hóa di sản văn hóa phi vật thể, safari sông độc đáo.', 
  'Đường Thanh Niên, Bình Minh, Thăng Bình, Quảng Nam', 'Quảng Nam', 'Thăng Bình', 
  15.75320000, 108.38420000, 'entertainment', 
  ARRAY['safari sông', 'công viên nước', 'đảo văn hóa dân gian'], ARRAY['gia đình', 'bạn bè'], 
  450000, 600000, 360, '09:00:00', '19:30:00', 
  'Rất rộng lớn nên thuê xe điện trong công viên để dễ di chuyển và tham quan vườn thú River Safari.', 'anytime', 
  ARRAY['https://images.unsplash.com/photo-1534447677768-be436bb09401'], 4.7, 8600
),
(
  'Fantasy Park', 'Fantasy Park Ba Na Hills', 
  'Khu vui chơi trong nhà rộng 21,000m2 lấy cảm hứng từ hai cuốn tiểu thuyết viễn tưởng nổi tiếng của Jules Verne.', 
  'Sun World Ba Na Hills, Hòa Vang, Đà Nẵng', 'Đà Nẵng', 'Hòa Vang', 
  15.99950000, 107.98750000, 'entertainment', 
  ARRAY['vui chơi trong nhà', 'đường trượt xe hiệp sĩ', 'khủng long rồng'], ARRAY['gia đình', 'bạn bè'], 
  0, 0, 120, '08:30:00', '17:00:00', 
  'Mọi trò chơi hầu hết miễn phí nằm trọn trong vé cáp treo Bà Nà Hills.', 'afternoon', 
  ARRAY['https://images.unsplash.com/photo-1509198397868-475647b2a1e5'], 4.6, 9100
),

-- ── TEMPLES & SHRINES (Chùa và Đền thờ) ──────────────────────────────────────
(
  'Chùa Linh Ứng Sơn Trà', 'Linh Ung Pagoda Son Tra', 
  'Ngôi chùa bề thế tọa lạc lưng chừng bán đảo Sơn Trà, nổi tiếng với bức tượng Phật Bà Quan Âm cao 67m ngắm vịnh biển hùng vĩ.', 
  'Bán đảo Sơn Trà, Thọ Quang, Sơn Trà, Đà Nẵng', 'Đà Nẵng', 'Sơn Trà', 
  16.10080000, 108.27780000, 'temple', 
  ARRAY['tượng quan âm khổng lồ', 'tâm linh', 'view biển', 'khỉ rừng'], ARRAY['gia đình', 'cặp đôi', 'người cao tuổi', 'solo'], 
  0, 0, 90, '06:00:00', '21:00:00', 
  'Ăn mặc trang nghiêm lịch sự che kín vai và đầu gối. Hãy cẩn thận giữ túi xách đề phòng khỉ tinh nghịch giật đồ.', 'morning', 
  ARRAY['https://images.unsplash.com/photo-1600585154340-be6161a56a0c'], 4.8, 19500
),
(
  'Chùa Linh Ứng Bà Nà', 'Linh Ung Pagoda Ba Na', 
  'Ngôi chùa tôn nghiêm mờ ảo trong sương khói Bà Nà Hills, nổi bật với bức tượng Phật Thích Ca lộ thiên màu trắng cao 27m.', 
  'Sun World Ba Na Hills, Hòa Vang, Đà Nẵng', 'Đà Nẵng', 'Hòa Vang', 
  15.99500000, 107.99420000, 'temple', 
  ARRAY['tượng phật lộ thiên', 'chùa cổ', 'sương khói tâm linh'], ARRAY['gia đình', 'người cao tuổi'], 
  0, 0, 60, '08:00:00', '17:30:00', 
  'Thường có sương mù bao phủ tạo cảm giác huyền bí thanh tịnh vô biên.', 'morning', 
  ARRAY['https://images.unsplash.com/photo-1548013146-72479768bada'], 4.7, 4300
),
(
  'Chùa Linh Ứng Ngũ Hành Sơn', 'Linh Ung Pagoda Marble Mountains', 
  'Ngôi chùa cổ xưa nhất trong hệ thống 3 chùa Linh Ứng Đà Nẵng, nằm tĩnh lặng trên ngọn Thủy Sơn kỳ vĩ.', 
  'Ngọn Thủy Sơn, Ngũ Hành Sơn, Hòa Hải, Đà Nẵng', 'Đà Nẵng', 'Ngũ Hành Sơn', 
  16.00420000, 108.26480000, 'temple', 
  ARRAY['ngôi chùa cổ nhất', 'thủy sơn', 'tâm linh lịch sử'], ARRAY['gia đình', 'người cao tuổi'], 
  0, 0, 60, '07:00:00', '17:30:00', 
  'Sau khi viếng chùa, đi bộ thêm vài chục bước lên Vọng Hải Đài để phóng tầm mắt ngắm bờ biển xanh ngát.', 'morning', 
  ARRAY['https://images.unsplash.com/photo-1549880338-65ddcdfd017b'], 4.6, 3200
),
(
  'Chùa Cầu', 'Chùa Cầu (Covered Bridge)', 
  'Linh hồn của di sản cổ kính Hội An, cây cầu ngói Nhật Bản bắc qua nhánh lạch nhỏ mang nét chạm khắc cổ xưa tinh tế.', 
  'Đường Trần Phú, Minh An, Hội An, Quảng Nam', 'Quảng Nam', 'Hội An', 
  15.87720000, 108.32580000, 'temple', 
  ARRAY['cầu cổ nhật bản', 'tâm linh', 'biểu tượng hội an'], ARRAY['gia đình', 'cặp đôi', 'solo', 'bạn bè'], 
  0, 0, 30, '00:00:00', '23:59:59', 
  'Ghé thăm vào ban đêm khi cầu được lên đèn chiếu sáng đổi sắc phản chiếu bóng nước rực rỡ.', 'evening', 
  ARRAY['https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e'], 4.8, 29200
),

-- ── 25+ ADDITIONAL NOTABLE PLACES (Để đạt tổng cộng 60+ địa điểm) ─────────────
-- VIEWPOINTS & BRIDGES (Cont.)
(
  'Vòng quay Sun Wheel', 'Sun Wheel Da Nang', 
  'Top 10 vòng quay cao nhất thế giới, cao 115m với cabin ngắm nhìn toàn cảnh thành phố lung linh lấp lánh.', 
  '01 Phan Đăng Lưu, Hòa Cường Bắc, Hải Châu, Đà Nẵng', 'Đà Nẵng', 'Hải Châu', 
  16.03820000, 108.22580000, 'viewpoint', 
  ARRAY['vòng quay khổng lồ', 'ngắm cảnh đêm', 'sun wheel'], ARRAY['cặp đôi', 'gia đình'], 
  100000, 150000, 45, '16:00:00', '22:00:00', 
  'Đi vào khung giờ 19h00 - 21h00 để ngắm nhìn thành phố lên đèn rực rỡ nhất.', 'evening', 
  ARRAY['https://images.unsplash.com/photo-1517404289873-c8421c17ee10'], 4.6, 5200
),
-- TEMPLES & SHRINES (Cont.)
(
  'Chùa Pháp Lâm', 'Phap Lam Pagoda', 
  'Ngôi chùa tĩnh lặng, trang nghiêm với kiến trúc Phật giáo Đại thừa đặc trưng, nằm ngay trung tâm thành phố nhộn nhịp.', 
  '500 Ông Ích Khiêm, Hải Châu 2, Hải Châu, Đà Nẵng', 'Đà Nẵng', 'Hải Châu', 
  16.06220000, 108.21680000, 'temple', 
  ARRAY['chùa tĩnh lặng', 'phật giáo đại thừa', 'trung tâm'], ARRAY['người cao tuổi', 'solo'], 
  0, 0, 45, '06:00:00', '18:00:00', 
  'Địa điểm thanh tịnh hoàn hảo để thiền hành niệm Phật tĩnh lặng tránh xa khói bụi.', 'morning', 
  ARRAY['https://images.unsplash.com/photo-1548013146-72479768bada'], 4.4, 850
),
-- HISTORICAL (Cont.)
(
  'Nhà cổ Tấn Ký', 'Tan Ky Old House', 
  'Ngôi nhà cổ hơn 200 năm tuổi đại diện tiêu biểu cho kiến trúc nhà phố Hội An xưa, kết hợp hài hòa phong cách Trung - Nhật - Việt.', 
  '101 Nguyễn Thái Học, Minh An, Hội An, Quảng Nam', 'Quảng Nam', 'Hội An', 
  15.87680000, 108.32620000, 'historical', 
  ARRAY['nhà cổ di sản', 'tấn ký', 'kiến trúc xưa'], ARRAY['gia đình', 'người cao tuổi', 'solo'], 
  0, 0, 45, '08:00:00', '17:45:00', 
  'Có bán chén Khổng Tử độc đáo và lắng nghe tích xưa đầy thú vị của chủ nhà.', 'morning', 
  ARRAY['https://images.unsplash.com/photo-1505691938895-1758d7feb511'], 4.6, 3100
),
(
  'Nhà cổ Phùng Hưng', 'Phung Hung Old House', 
  'Ngôi nhà cổ có tuổi đời hơn 240 năm mang phong cách thiết kế độc đáo tạo cảm giác thanh tao lãng mạn.', 
  '04 Nguyễn Thị Minh Khai, Minh An, Hội An, Quảng Nam', 'Quảng Nam', 'Hội An', 
  15.87750000, 108.32550000, 'historical', 
  ARRAY['nhà cổ gỗ lim', 'kiến trúc nhật bản', 'phùng hưng'], ARRAY['gia đình', 'người cao tuổi'], 
  0, 0, 45, '08:00:00', '18:00:00', 
  'Gỗ lim cao cấp đen bóng vững vàng và gác gỗ được thiết kế chống ngập lụt hiệu quả.', 'morning', 
  ARRAY['https://images.unsplash.com/photo-1513694203232-719a280e022f'], 4.5, 1800
),
(
  'Hội quán Phúc Kiến', 'Fujian Assembly Hall', 
  'Hội quán rộng lớn thế thế cổ kính nhất Hội An thờ Thiên Hậu Thánh Mẫu phù hộ ngư dân đi biển.', 
  '46 Trần Phú, Cẩm Châu, Hội An, Quảng Nam', 'Quảng Nam', 'Hội An', 
  15.87850000, 108.32980000, 'historical', 
  ARRAY['hội quán trung hoa', 'phúc kiến', 'tâm linh di sản'], ARRAY['gia đình', 'người cao tuổi'], 
  0, 0, 60, '07:30:00', '17:30:00', 
  'Thắp nhang vòng treo trên cao gửi gắm lời nguyện ước bình an cho gia đình.', 'morning', 
  ARRAY['https://images.unsplash.com/photo-1498307833015-e7b400441eb8'], 4.7, 6500
),
(
  'Hội quán Quảng Đông', 'Cantonese Assembly Hall', 
  'Hội quán do Hoa kiều Quảng Đông xây dựng mang đậm chất nghệ thuật gốm sứ chạm khắc rồng cực tinh xảo.', 
  '176 Trần Phú, Minh An, Hội An, Quảng Nam', 'Quảng Nam', 'Hội An', 
  15.87720000, 108.32520000, 'historical', 
  ARRAY['hội quán hoa kiều', 'quảng đông', 'chạm rồng sứ'], ARRAY['gia đình', 'người cao tuổi'], 
  0, 0, 45, '07:30:00', '17:30:00', 
  'Hồ nước chạm khắc hình rồng bằng gốm sứ đập vào mắt ngay khi bước vào cổng.', 'morning', 
  ARRAY['https://images.unsplash.com/photo-1498307833015-e7b400441eb8'], 4.5, 3400
),
(
  'Hội quán Triều Châu', 'Chaozhou Assembly Hall', 
  'Công trình có nghệ thuật điêu khắc gỗ tinh xảo bậc nhất xứ Quảng, thờ các vị thần đi biển sóng gió.', 
  '157 Nguyễn Duy Hiệu, Cẩm Châu, Hội An, Quảng Nam', 'Quảng Nam', 'Hội An', 
  15.87920000, 108.33380000, 'historical', 
  ARRAY['điêu khắc gỗ', 'triều châu', 'tĩnh lặng cổ kính'], ARRAY['gia đình', 'người cao tuổi'], 
  0, 0, 45, '07:30:00', '17:00:00', 
  'Nằm xa trung tâm phố cổ hơn nên không gian rất yên tĩnh không xô bồ.', 'afternoon', 
  ARRAY['https://images.unsplash.com/photo-1498307833015-e7b400441eb8'], 4.3, 1100
),
-- NATURE & PARKS (Cont.)
(
  'Hồ Hòa Trung', 'Hoa Trung Lake', 
  'Hồ chứa nước hoang sơ tuyệt đẹp được ví như thảo nguyên mông cổ thu nhỏ, điểm cắm trại lý tưởng cuối tuần.', 
  'Xã Hòa Liên, Hòa Vang, Đà Nẵng', 'Đà Nẵng', 'Hòa Vang', 
  16.10820000, 108.11380000, 'nature', 
  ARRAY['hồ nước dã ngoại', 'thảo nguyên cỏ xanh', 'cắm trại tự do'], ARRAY['bạn bè', 'solo'], 
  0, 0, 180, '00:00:00', '23:59:59', 
  'Thích hợp đi vào mùa khô từ tháng 9 đến tháng 12 khi lòng hồ cạn nước lấp đầy cỏ xanh.', 'afternoon', 
  ARRAY['https://images.unsplash.com/photo-1469474968028-56623f02e42e'], 4.4, 1300
),
(
  'Đồng Xanh Đồng Nghệ', 'Dong Xanh Dong Nghe Lake', 
  'Hồ nước nhân tạo phẳng lặng như tờ, hai bên bờ rừng xanh thẳm lý tưởng chèo thuyền kayak thư giãn.', 
  'Xã Hòa Khương, Hòa Vang, Đà Nẵng', 'Đà Nẵng', 'Hòa Vang', 
  15.93280000, 108.06520000, 'nature', 
  ARRAY['hồ nước dã ngoại', 'chèo thuyền kayak', 'đạp xe quanh hồ'], ARRAY['bạn bè', 'cặp đôi'], 
  0, 50000, 180, '07:00:00', '18:00:00', 
  'Thuê thuyền kayak chèo ra giữa lòng hồ lúc chiều tà ngắm hoàng hôn buông xuống rực rỡ.', 'afternoon', 
  ARRAY['https://images.unsplash.com/photo-1454496522488-7a8e488e8606'], 4.3, 850
),
(
  'Khu sinh thái Lái Thiêu', 'Lai Thieu Eco Park', 
  'Miền tây giữa miền trung với miệt vườn trái cây sum suê trĩu quả cùng các trò chơi dân gian rực rỡ.', 
  'Thôn Phú Túc, Hòa Phú, Hòa Vang, Đà Nẵng', 'Đà Nẵng', 'Hòa Vang', 
  15.96220000, 107.96280000, 'nature', 
  ARRAY['miệt vườn trái cây', 'khu sinh thái', 'trò chơi dân gian'], ARRAY['gia đình', 'bạn bè'], 
  50000, 80000, 240, '07:30:00', '17:00:00', 
  'Rất thích hợp cho các buổi dã ngoại đông người dạo vườn cây ăn trái.', 'morning', 
  ARRAY['https://images.unsplash.com/photo-1464822759023-fed622ff2c3b'], 4.0, 420
),
(
  'Ghềnh Bàng', 'Ghenh Bang', 
  'Bãi đá hoang sơ tuyệt đẹp dọc ven biển bán đảo Sơn Trà với những phiến đá muôn hình vạn trạng nhô lên đón sóng.', 
  'Bán đảo Sơn Trà, Thọ Quang, Sơn Trà, Đà Nẵng', 'Đà Nẵng', 'Sơn Trà', 
  16.12820000, 108.28380000, 'nature', 
  ARRAY['bãi đá gồ ghề', 'phượt hoang dã', 'câu cá biển'], ARRAY['solo', 'bạn bè'], 
  0, 0, 120, '00:00:00', '23:59:59', 
  'Đường đi bộ dốc đá xuống khá khó đi và trơn trượt, hãy đi giày thể thao có độ bám tốt.', 'morning', 
  ARRAY['https://images.unsplash.com/photo-1469474968028-56623f02e42e'], 4.2, 920
),
(
  'Mũi Nghê', 'Mui Nghe Son Tra', 
  'Nơi đón ánh bình minh đầu tiên của thành phố Đà Nẵng, kiệt tác thiên nhiên hồ nước mặn xanh ngắt.', 
  'Đường Hoàng Sa, Thọ Quang, Sơn Trà, Đà Nẵng', 'Đà Nẵng', 'Sơn Trà', 
  16.11520000, 108.30520000, 'viewpoint', 
  ARRAY['mũi nghê', 'bình minh sớm nhất', 'hồ xanh tự nhiên'], ARRAY['solo', 'bạn bè'], 
  0, 0, 150, '00:00:00', '23:59:59', 
  'Cực kỳ mạo hiểm đường dốc núi trơn trượt dốc đứng, cần đi theo nhóm đông và chuẩn bị kỹ nước uống.', 'morning', 
  ARRAY['https://images.unsplash.com/photo-1464822759023-fed622ff2c3b'], 4.5, 840
),
(
  'Công viên APEC', 'APEC Park', 
  'Công viên biểu tượng mới bên bờ sông Hàn với mái vòm hình tổ chim khổng lồ bằng thép uốn lượn nghệ thuật.', 
  'Đường 2 Tháng 9, Bình Hiên, Hải Châu, Đà Nẵng', 'Đà Nẵng', 'Hải Châu', 
  16.05920000, 108.22320000, 'park', 
  ARRAY['APEC', 'cánh diều khổng lồ', 'check-in trẻ trung', 'đêm sông Hàn'], ARRAY['bạn bè', 'cặp đôi', 'solo'], 
  0, 0, 45, '00:00:00', '23:59:59', 
  'Buổi tối khi hệ thống đèn LED nhiều màu thắp sáng lấp lánh là lúc check-in chụp ảnh lý tưởng nhất.', 'evening', 
  ARRAY['https://images.unsplash.com/photo-1519451241324-20b4ea2c4220'], 4.5, 3200
),
-- FOOD & DRINKS (Cont.)
(
  'Bánh mỳ Phượng', 'Banh Mi Phuong', 
  'Bánh mì kẹp ngon nhất thế giới được Anthony Bourdain ca ngợi hết lời, giòn tan đậm đà nước sốt bí truyền.', 
  '2B Phan Chu Trinh, Cẩm Châu, Hội An, Quảng Nam', 'Quảng Nam', 'Hội An', 
  15.87850000, 108.33080000, 'food', 
  ARRAY['bánh mì phượng', 'anthony bourdain', 'đặc sản thế giới'], ARRAY['gia đình', 'cặp đôi', 'solo', 'bạn bè'], 
  25000, 50000, 30, '06:30:00', '21:30:00', 
  'Xếp hàng mua trực tiếp ở tiệm, thử vị bánh mì thập cẩm đầy đủ để trải nghiệm trọn vẹn vị béo ngậy pate.', 'anytime', 
  ARRAY['https://images.unsplash.com/photo-1509722747041-616f39b57569'], 4.4, 8200
),
(
  'Bánh mỳ Madam Khánh', 'Banh Mi Madam Khanh', 
  'Được ca tụng là "The Banh Mi Queen" của Hội An với vỏ bánh siêu giòn cùng nước sốt sánh mịn đậm vị.', 
  '115 Trần Cao Vân, Minh An, Hội An, Quảng Nam', 'Quảng Nam', 'Hội An', 
  15.88120000, 108.32820000, 'food', 
  ARRAY['bánh mì queen', 'nước sốt bí truyền', 'đặc sản hội an'], ARRAY['gia đình', 'cặp đôi', 'solo', 'bạn bè'], 
  20000, 40000, 30, '06:00:00', '22:00:00', 
  'Không gian nhỏ hẹp hơn nên đa số thực khách mua mang đi ăn dạo dọc phố cổ.', 'anytime', 
  ARRAY['https://images.unsplash.com/photo-1509722747041-616f39b57569'], 4.6, 6200
),
(
  'Cơm gà Bà Buội', 'Ba Buoi Chicken Rice', 
  'Quán cơm gà gia truyền lâu đời nhất Hội An từ năm 1950, đĩa cơm thơm dẻo cùng nước dùng ngọt đậm đà.', 
  '22 Phan Chu Trinh, Minh An, Hội An, Quảng Nam', 'Quảng Nam', 'Hội An', 
  15.87880000, 108.32920000, 'food', 
  ARRAY['cơm gà gia truyền', 'gà ta xé phay', 'cơm dẻo thơm'], ARRAY['gia đình', 'cặp đôi', 'solo'], 
  40000, 80000, 45, '11:00:00', '19:00:00', 
  'Cơm gà bán hết rất nhanh tầm chiều, bạn nên ưu tiên ghé ăn vào buổi trưa cho thảnh thơi.', 'anytime', 
  ARRAY['https://images.unsplash.com/photo-1555939594-58d7cb561ad1'], 4.3, 7100
),
(
  'Cơm gà Ty', 'Ty Chicken Rice', 
  'Tiệm cơm gà nổi tiếng không kém với đĩa gà ta dai giòn béo ngậy được rưới nước sốt lòng mề đậm đà.', 
  '27 Phan Chu Trinh, Minh An, Hội An, Quảng Nam', 'Quảng Nam', 'Hội An', 
  15.87910000, 108.32910000, 'food', 
  ARRAY['cơm gà ta', 'nước sốt lòng mề', 'gia truyền'], ARRAY['gia đình', 'cặp đôi', 'solo'], 
  40000, 80000, 45, '09:00:00', '21:00:00', 
  'Quán rộng mát mẻ, gà xé cực giòn dai thấm tháp hành tây.', 'anytime', 
  ARRAY['https://images.unsplash.com/photo-1555939594-58d7cb561ad1'], 4.5, 3400
),
(
  'Bánh tráng cuốn thịt heo Trần', 'Tran Rice Paper Pork Roll', 
  'Nhà hàng đặc sản bánh tráng thịt heo hai đầu mỡ nổi tiếng, kết hợp chén mắm nêm đậm vị xứ Quảng đặc trưng.', 
  '04 Lê Duẩn, Hải Châu, Đà Nẵng', 'Đà Nẵng', 'Hải Châu', 
  16.07150000, 108.22120000, 'food', 
  ARRAY['bánh tráng thịt heo', 'thịt hai đầu da', 'mắm nêm trần'], ARRAY['gia đình', 'cặp đôi', 'bạn bè'], 
  100000, 200000, 60, '09:00:00', '22:00:00', 
  'Mắm nêm của quán Trần có hương vị đậm đặc trưng nhưng khá cay, bạn nào không ăn cay được nên lưu ý báo nhân viên.', 'anytime', 
  ARRAY['https://images.unsplash.com/photo-1563865436874-9aef32095ffd'], 4.4, 9800
),
(
  'Bánh xèo Bà Dưỡng', 'Ba Duong Savory Crepe', 
  'Quán bánh xèo nem lụi trứ danh nằm sâu trong hẻm nhỏ Hoàng Diệu, nước tương đậu phộng béo bùi ngon nuốt lưỡi.', 
  'K280/23 Hoàng Diệu, Bình Hiên, Hải Châu, Đà Nẵng', 'Đà Nẵng', 'Hải Châu', 
  16.06020000, 108.21780000, 'food', 
  ARRAY['bánh xèo giòn rụm', 'nem lụi', 'nước tương gan béo ngậy', 'hẻm ẩm thực'], ARRAY['bạn bè', 'cặp đôi', 'solo'], 
  20000, 100000, 60, '09:30:00', '21:30:00', 
  'Đi xe máy luồn lách hẻm hoặc đi taxi đỗ ngoài đường Hoàng Diệu rồi đi bộ vào chừng 100m.', 'afternoon', 
  ARRAY['https://images.unsplash.com/photo-1563865436874-9aef32095ffd'], 4.6, 12800
),
(
  'Hải sản Năm Đảnh', 'Nam Dan Seafood', 
  'Quán hải sản bình dân nằm sâu trong ngõ hẻm dốc Sơn Trà nhưng lúc nào cũng nườm nượp thực khách vì món ăn tươi ngon giá rẻ đồng giá.', 
  'K139/H59/38 Trần Quang Khải, Thọ Quang, Sơn Trà, Đà Nẵng', 'Đà Nẵng', 'Sơn Trà', 
  16.09820000, 108.26180000, 'food', 
  ARRAY['hải sản đồng giá', 'hải sản hẻm', 'ốc nướng', 'ngon bổ rẻ'], ARRAY['bạn bè', 'gia đình'], 
  60000, 150000, 90, '10:00:00', '20:30:00', 
  'Nên đi sớm trước 12h trưa hoặc 18h tối để tránh cháy hàng các món hot như chip chip hấp sả.', 'afternoon', 
  ARRAY['https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2'], 4.3, 11400
),
(
  'Hải sản Bé Mặn', 'Be Man Seafood', 
  'Quán hải sản ven biển cực rộng lớn, tự tay chọn hải sản bơi sống trong bể cân ký và đầu bếp chế biến tại chỗ.', 
  'Lô 11 Đường Võ Nguyên Giáp, Mân Thái, Sơn Trà, Đà Nẵng', 'Đà Nẵng', 'Sơn Trà', 
  16.08250000, 108.24920000, 'food', 
  ARRAY['hải sản tươi sống', 'bể hải sản chọn lựa', 'ven biển gió mát'], ARRAY['gia đình', 'bạn bè'], 
  150000, 800000, 120, '09:00:00', '23:30:00', 
  'Giá hải sản sống cân ký tính theo thời giá, hãy hỏi kỹ và thỏa thuận giá chế biến trước khi cân.', 'evening', 
  ARRAY['https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2'], 4.2, 9800
),
(
  'Mỳ Quảng Ếch Trang', 'Trang Frog Noodles', 
  'Mì Quảng ếch bày trí sáng tạo độc đáo trong thố đất giữ nhiệt nóng hổi cùng mẹt rau xanh ngát tươi mát.', 
  '441 Ông Ích Khiêm, Hải Châu 2, Hải Châu, Đà Nẵng', 'Đà Nẵng', 'Hải Châu', 
  16.06320000, 108.21720000, 'food', 
  ARRAY['mì quảng ếch', 'thố đất nóng hổi', 'trải nghiệm ẩm thực'], ARRAY['gia đình', 'cặp đôi', 'solo'], 
  45000, 80000, 45, '06:00:00', '22:15:00', 
  'Thịt ếch rim sả ớt trong thố đất đậm đà, bánh tráng nướng ăn kèm giòn rụm.', 'anytime', 
  ARRAY['https://images.unsplash.com/photo-1555396273-367ea4eb4db5'], 4.5, 7800
),
(
  'Chè Liên', 'Che Lien', 
  'Thương hiệu chè sầu riêng nức tiếng Đà Nẵng với nước cốt dừa béo ngậy thơm nồng đặc trưng.', 
  '189 Hoàng Diệu, Nam Dương, Hải Châu, Đà Nẵng', 'Đà Nẵng', 'Hải Châu', 
  16.06380000, 108.21920000, 'food', 
  ARRAY['chè sầu riêng', 'chè thái dừa dầm', 'béo ngậy cốt dừa'], ARRAY['bạn bè', 'gia đình', 'cặp đôi'], 
  15000, 30000, 30, '08:00:00', '22:00:00', 
  'Nên ăn chè thái sầu riêng đặc sản. Quán rất đông nên mua mang về cũng là giải pháp nhanh chóng.', 'afternoon', 
  ARRAY['https://images.unsplash.com/photo-1563865436874-9aef32095ffd'], 4.5, 12100
),
(
  'Cà phê Cộng (Đường Bạch Đằng)', 'Cong Caphe Bach Dang', 
  'Không gian hoài niệm thời bao cấp cổ xưa độc đáo bên bờ sông Hàn, nổi tiếng với cà phê cốt dừa thơm bùi ngậy.', 
  '98-100 Bạch Đằng, Hải Châu 1, Hải Châu, Đà Nẵng', 'Đà Nẵng', 'Hải Châu', 
  16.06920000, 108.22350000, 'food', 
  ARRAY['cafe bao cấp', 'cafe cốt dừa', 'view sông Hàn'], ARRAY['cặp đôi', 'solo', 'bạn bè'], 
  35000, 70000, 60, '07:00:00', '23:00:00', 
  'Ngồi dãy bàn ban công tầng 2 ngắm tàu rồng du lịch lướt qua lướt lại trên sông Hàn mát rượi.', 'evening', 
  ARRAY['https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb'], 4.5, 6200
),
-- ENTERTAINMENT & AMUSEMENT (Cont.)
(
  'Khu trượt thác Hòa Phú Thành', 'Hoa Phu Thanh Slide Waterfall', 
  'Trải nghiệm thể thao mạo hiểm trượt thác nước bằng xuồng cao su cực kỳ kịch tính và gay cấn.', 
  'QL14G, Hòa Phú, Hòa Vang, Đà Nẵng', 'Đà Nẵng', 'Hòa Vang', 
  15.95520000, 107.94820000, 'entertainment', 
  ARRAY['trượt thác nước', 'zipline mạo hiểm', 'dã ngoại rừng núi'], ARRAY['bạn bè', 'solo'], 
  100000, 250000, 180, '07:30:00', '16:00:00', 
  'Mỗi ngày chỉ có 2 ca thả thác lúc 10h30 sáng và 14h30 chiều. Hãy chuẩn bị sẵn đồ bơi.', 'afternoon', 
  ARRAY['https://images.unsplash.com/photo-1509198397868-475647b2a1e5'], 4.5, 3900
),
(
  'Suối khoáng nóng Núi Thần Tài', 'Nui Than Tai Hot Spring Park', 
  'Công viên suối khoáng nóng thư giãn giữa thiên nhiên núi rừng bao la, dịch vụ tắm bùn khoáng cao cấp.', 
  'QL14G, Hòa Phú, Hòa Vang, Đà Nẵng', 'Đà Nẵng', 'Hòa Vang', 
  15.96820000, 107.93520000, 'entertainment', 
  ARRAY['tắm khoáng nóng', 'tắm bùn thư giãn', 'công viên nước'], ARRAY['gia đình', 'cặp đôi', 'người cao tuổi'], 
  400000, 500000, 300, '08:30:00', '17:30:00', 
  'Nên trải nghiệm luộc trứng gà bằng nước khoáng nóng tự nhiên 98 độ cực kỳ thơm bùi.', 'morning', 
  ARRAY['https://images.unsplash.com/photo-1540555700478-4be289fbecef'], 4.7, 8500
),
-- TEMPLES & SHRINES (Cont.)
(
  'Chùa Non Nước (Ngũ Hành Sơn)', 'Non Nuoc Pagoda', 
  'Ngôi chùa cổ kính nép mình yên bình bên vách đá cẩm thạch Thủy Sơn cổ kính tĩnh mịch rêu phong.', 
  'Ngọn Thủy Sơn, Hòa Hải, Ngũ Hành Sơn, Đà Nẵng', 'Đà Nẵng', 'Ngũ Hành Sơn', 
  16.00350000, 108.26420000, 'temple', 
  ARRAY['chùa cổ vách đá', 'tâm linh tĩnh lặng', 'ngũ hành sơn'], ARRAY['gia đình', 'người cao tuổi'], 
  0, 0, 45, '07:00:00', '17:30:00', 
  'Khói hương phảng phất tĩnh mịch rêu phong, hãy đi nhẹ nói khẽ để giữ sự uy nghiêm tôn kính.', 'morning', 
  ARRAY['https://images.unsplash.com/photo-1548013146-72479768bada'], 4.5, 1400
),
(
  'Nhà thờ Chính Tòa Đà Nẵng', 'Da Nang Cathedral (Pink Church)', 
  'Nhà thờ có màu hồng dễ thương duy nhất được xây dựng vào thời Pháp thuộc, kiến trúc Gothic cao vút cuốn hút.', 
  '156 Trần Phú, Hải Châu 1, Hải Châu, Đà Nẵng', 'Đà Nẵng', 'Hải Châu', 
  16.06680000, 108.22320000, 'temple', 
  ARRAY['nhà thờ con gà', 'kiến trúc gothic', 'màu hồng dễ thương'], ARRAY['bạn bè', 'cặp đôi', 'solo'], 
  0, 0, 45, '06:00:00', '19:00:00', 
  'Nhà thờ chỉ cho phép chụp ảnh tham quan bên ngoài khuôn viên vườn hoa, hãy tôn trọng các giờ làm lễ thánh.', 'morning', 
  ARRAY['https://images.unsplash.com/photo-1548013146-72479768bada'], 4.3, 8900
),
(
  'Đền thờ Công mẫu (Hội An)', 'Fujain Assembly Hall', 
  'Ngôi đền thờ cổ rêu phong trầm mặc của bang Phúc Kiến giữa lòng đô thị cổ, trang nghiêm sừng sững.', 
  '46 Trần Phú, Minh An, Hội An, Quảng Nam', 'Quảng Nam', 'Hội An', 
  15.87850000, 108.32980000, 'temple', 
  ARRAY['đền thờ cổ', 'rêu phong trầm mặc', 'di sản'], ARRAY['gia đình', 'người cao tuổi'], 
  0, 0, 45, '07:30:00', '17:30:00', 
  'Mùi trầm hương thoang thoảng nhẹ nhàng giúp tâm hồn thanh tịnh sảng khoái.', 'morning', 
  ARRAY['https://images.unsplash.com/photo-1498307833015-e7b400441eb8'], 4.4, 750
);
