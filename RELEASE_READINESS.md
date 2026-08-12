# Release readiness — 12/08/2026

## Kết luận

Phần triển khai được trong repository đã hoàn tất theo hướng production và không dùng mock/seed/fallback dữ liệu giả. Dự án vẫn là **release candidate**, chưa được gọi production-ready cho tới khi SQL chạy trên Supabase staging và các luồng được smoke test trên Android/iOS thật.

Thanh toán nằm ngoài phạm vi; không bật thu tiền từ trạng thái này.

## Đã xác minh trong workspace

- Expo SDK 54 dependency matrix nhất quán; giữ SDK 54 để tương thích Expo Go trên store hiện tại.
- TypeScript strict và ESLint đạt.
- Frontend: 15 suite, 73/73 test đạt.
- Backend: 16/16 Maven test đạt.
- Expo Doctor 18/18 và `expo install --check` đạt ở lần kiểm tra repository.
- `npm audit`: 0 critical, 11 high, 9 moderate; advisory còn lại thuộc dependency/toolchain SDK 54, không force-upgrade.
- Production public config và Android Expo bundle export đạt.
- Production config fail-fast; CI có backend/security/lint/typecheck/test/doctor/package/export gates.
- Không có SQL seed địa điểm; itinerary lưu bằng RPC atomic, share/token allowlist, admin/support/account actions audited.
- Auth recovery/legal/avatar/account deletion; search/pagination; review/helpful/report; ticket; AI single-flight/quota refund đã có đường đi thật.
- UI hardening đã tách status bar theo surface, thêm map status scrim/modal override, safe-area cho hero/tab/sheet và keyboard avoidance cho form dài.
- Animation nền chạy lặp đã bị loại; motion chức năng dùng Reduce Motion toàn cục. Bundle Android/iOS/web sau thay đổi UI đã export thành công.
- Map chỉ vẽ geometry từ router, không fallback Polyline đường chim bay; đổi ngày/đóng modal không thể ghi đè bằng response cũ.
- Free và VIP dùng ma trận theo đúng phương tiện cho thứ tự/km/phút; fallback được gắn nhãn `estimated`, không giả là dữ liệu đường thực tế.
- Tối ưu tuyến nhỏ có nhánh exact (client/backend ≤8 điểm); tuyến lớn dùng heuristic theo thời gian tuyến nhanh. Backend chia ngày bằng dynamic programming theo thời lượng tham quan, thời gian đường và buffer.

## External gates bắt buộc

1. Cài `01_schema.sql` lên Supabase staging sạch và chạy `02_verify_rls.sql` thành công.
2. Sinh `src/types/database.generated.ts` từ chính staging schema, kết nối typed client và chạy lại typecheck/test.
3. Smoke Android/iOS thật: tai thỏ/Dynamic Island/camera cutout, status bar trên map và map modal, auth recovery, deep link share, keyboard, Reduce Motion, location/photo, upload, background/resume, mạng chậm/offline.
4. Dùng JWT staging kiểm tra backend 401/banned/quota/VIP/upstream timeout và quota concurrency.
5. Cấu hình/kiểm Maps key, CORS, secret store, signing credential, log redaction, monitoring và backup/restore.
6. Tạo EAS production artifact, smoke đúng artifact rồi mới rollout.
7. Dựng và smoke bốn OSRM profile production; xác minh geometry, snap radius, no-route/timeout, dữ liệu OSM cập nhật và giám sát `/route` + `/table`.

## Rủi ro được chấp nhận có điều kiện

- SDK 54 còn advisory toolchain không critical. Theo dõi Dependabot/Expo patch; nâng SDK bằng development build, không dùng `audit fix --force`.
- Rate limiter backend là in-memory; chỉ chạy một replica. Trước khi scale phải dùng shared store.
- OSRM là routing tĩnh, không có giao thông thời gian thực. Kết quả là open path giữa các điểm đã chọn và chưa tính khách sạn/vị trí xuất phát.
- Bucket public phù hợp ảnh đã duyệt/avatar; không mở editor upload ảnh revision công khai.
- `app/(tabs)/create.tsx` còn là route orchestration lớn dù component, config, optimizer và validation đã tách. Chỉ tiếp tục tách khi có thay đổi nghiệp vụ để tránh phình abstraction.

## Smoke checklist staging

- Đăng ký → xác nhận email/deep link → setup profile/avatar → login/logout → reset password → xóa tài khoản.
- Editor tạo draft có nguồn thật và gửi duyệt; admin duyệt/từ chối; user chỉ thấy published place.
- Search/filter/pagination/map/retry; save place; tạo/sửa review, helpful, report và admin resolution.
- Tạo/sửa/clone lịch trình nhiều ngày; đổi giờ; dự báo đúng date; map từng ngày; share/vote/revoke.
- Với từng phương tiện: so geometry với đường hợp lệ, kiểm preview và lịch đã lưu cùng thứ tự/km/phút; tắt router phải hiện cảnh báo và không vẽ đường thẳng.
- User gửi/reply ticket; admin reply+resolve atomic.
- AI xử lý missing/expired JWT, single-flight, quota free/VIP và refund khi upstream lỗi.
