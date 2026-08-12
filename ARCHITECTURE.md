# Kiến trúc dự án

## Biên hệ thống

```text
Expo app
├── Supabase Auth/PostgREST/Storage (RLS là lớp phân quyền cuối)
├── Spring Boot /api/ai/* (JWT, quota, VIP, Gemini, OSRM)
├── Open-Meteo (dự báo công khai)
└── OSRM (route preview công khai)
```

CRUD thông thường đi thẳng Supabase để giữ hệ thống nhỏ. Tác vụ có server secret, quota hoặc quyền đặc biệt đi qua Spring Boot/RPC `SECURITY DEFINER`. Mobile luôn được coi là client không tin cậy.

## Cây mã nguồn

```text
app/                         Route/layout và orchestration màn hình
src/
  components/               UI dùng lại, không truy vấn Supabase
  constants/                Theme, taxonomy và cấu hình tĩnh
  features/
    admin/                   Query và UI quản trị
    ai/                      API/history AI
    auth/                    Error mapping và auth helpers
    itinerary/               Scheduler, optimizer, validation và components
    legal/                   Phiên bản điều khoản
    location/                Quyền/vị trí thiết bị
    places/                  Query, review, report, storage
    profile/                 Avatar/profile API
    support/                 Ticket API
    vip/                     Entitlement API; không phải purchase flow
  hooks/                    Facade tương thích cho mã cũ
  services/                 Client/adapters hạ tầng dùng chung
  stores/                   Session và draft cần dùng xuyên route
  types/                    Domain model canonical
backend/                     Vùng tin cậy AI/routing/quota
scripts/                     Schema cài mới và RLS staging test
__tests__/                   Unit/static contract tests
```

Các route lớn hiện đã tách phần UI/thuật toán quan trọng sang feature; `app/(tabs)/create.tsx` còn giữ orchestration ba bước để tránh tạo thêm abstraction không mang giá trị. Logic thuần mới phải nằm trong feature service và có test.

## Quy tắc phụ thuộc và dữ liệu

- Route có thể import feature; feature không import từ `app/`.
- Component dùng chung không gọi Supabase.
- Query theo miền đặt tại `src/features/<miền>/api`.
- Quyền admin/editor/VIP không dựa vào việc ẩn nút; RLS/backend/RPC mới là quyết định cuối.
- Lịch trình chỉ có `private` hoặc `shared`; không có feed công khai. Share token có hạn, revoke sẽ vô hiệu token cũ.
- Lưu lịch trình dùng một RPC atomic; không fallback thành chuỗi insert.
- Địa điểm thật đi qua draft/pending/published và có revision/audit; không seed dữ liệu sản phẩm.
- Ngày du lịch là local calendar date, không chuyển qua UTC ISO trước khi lưu.

Database type sinh tự động chỉ nên tạo sau khi `01_schema.sql` đã chạy trên Supabase staging (`supabase gen types`). Không tự viết type “giả generated” trước khi database tồn tại; bước này được ghi là external gate trong `plan.md`.
