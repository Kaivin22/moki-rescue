# Kế hoạch hoàn thiện Đi Đà Nẵng — trạng thái thực thi

> Cập nhật 12/08/2026. File này thay thế toàn bộ bản phân tích/kế hoạch trước và ghi lại kết quả triển khai thực tế. Phạm vi rà soát không gồm `specs/`, `node_modules/`; thanh toán không nằm trong phạm vi.

## 1. Kết luận hiện tại

Sản phẩm được chốt là **ứng dụng khám phá và lập lịch trình du lịch Đà Nẵng**, không phải ứng dụng lịch chung hay nền tảng đặt dịch vụ. Tên hiển thị là **Đi Đà Nẵng**, tagline **Khám phá địa điểm · Lập lịch trình · Tối ưu đường đi**; slug, scheme và bundle identifier được giữ để không phá deep link/binary identity.

Phần có thể hoàn thành an toàn trong repository đã được triển khai theo hướng production: không tự nạp mock/fallback dữ liệu giả, catalog tùy chọn chỉ chứa địa điểm thật có nguồn, không vẽ đường chim bay như tuyến thật, các mutation nhạy cảm dùng RLS/RPC atomic, các bề mặt chính có loading/error/retry và test. Dữ liệu tạo lịch có policy duy nhất ở UI/store/optimizer/SQL/backend; lịch không thể lưu nếu rỗng, trùng điểm, vượt giới hạn, chồng giờ, qua nửa đêm, sai giờ mở cửa hoặc còn điểm chưa xếp.

Dự án là **release candidate**, chưa được gọi production-ready cho tới khi hoàn tất Supabase staging, type generation từ database thật và smoke test Android/iOS/EAS artifact. Không có công việc nào trong repository có thể thay thế các gate hạ tầng này.

## 2. Quyết định Expo SDK 54

Không nâng lên SDK 57 trong đợt này. Tài liệu Expo hiện hành xác nhận Expo Go trên store chỉ hỗ trợ một SDK tại một thời điểm và bản store hiện hỗ trợ SDK 54; nếu đổi project lên SDK 57 thì quét QR bằng Expo Go SDK 54 sẽ báo không tương thích. Giữ SDK 54 bảo toàn luồng quét QR mà chủ dự án đang dùng. Theo `AGENTS.md`, mọi thay đổi vẫn được đối chiếu tài liệu versioned v57 để tránh dùng API/config lỗi thời; việc đối chiếu tài liệu không đồng nghĩa nâng dependency.

Đây không phải quyết định giữ SDK 54 vĩnh viễn. Hướng production là tạo **development build**, sau đó nâng tuần tự từng SDK theo tài liệu versioned và chạy native smoke test. Production binary không phụ thuộc Expo Go.

- Node baseline: `>=20.19.0`, `.nvmrc` là `20.19.4`.
- Expo `~54.0.0`, React Native `0.81.5`, React `19.1.0` được giữ nguyên.
- CI kiểm `expo-doctor` và `expo install --check`; không dùng `audit fix --force` để ép SDK.
- Nguồn quyết định: [Expo Development Builds FAQ](https://docs.expo.dev/develop/development-builds/faq/), [Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/) và [SDK upgrade walkthrough](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/).

## 3. Trạng thái theo các gate cũ

### Gate A — baseline/config/CI/tài liệu

- [x] Chuẩn hóa `.env.example`; production fail-fast nếu thiếu tên biến canonical.
- [x] Giữ fallback tên Supabase cũ chỉ cho local development để không làm hỏng `.env` riêng của chủ dự án.
- [x] Thêm Node engine/`.nvmrc`, lint, typecheck, Jest, Expo Doctor, package check, audit critical và secret pattern gate vào CI.
- [x] CI dùng config placeholder, chạy bundle Android/iOS/web ngay trên PR/push và chỉ upload artifact ở `main`; không phụ thuộc hoặc nhúng production secret. Binary thật dùng EAS `production`.
- [x] Đồng bộ README, architecture, security, deployment và release readiness.
- [x] Không nâng SDK 57 theo quyết định tương thích Expo Go nêu trên.
- [ ] Android/iOS thật và EAS artifact: external gate.

Không tự tạo commit/snapshot vì worktree ban đầu đã có nhiều thay đổi chưa commit của chủ dự án; agent không được phép gom chúng thành một commit mà chưa có yêu cầu cụ thể.

### Gate B — SQL và hợp đồng dữ liệu

- [x] Thay schema nối vá bằng `scripts/01_schema.sql` baseline sạch; tách catalog 15 địa điểm thật có nguồn thành `scripts/03_seed_real_places.sql` tùy chọn.
- [x] Reset local/staging bắt buộc `app.allow_destructive_reset='yes'` và dọn storage object trước khi drop schema.
- [x] Constraint, index, trigger, explicit grant/default privilege revoke và RLS theo role.
- [x] Profile trigger fail-observable, trim/limit metadata và backfill idempotent.
- [x] Editor draft/revision/admin moderation; review/report/support/user-access có RPC và audit.
- [x] Itinerary chỉ `private/shared`; upsert atomic; share/vote/revoke dùng token; response share là allowlist không lộ owner/token. Clone được đưa qua planner rồi dùng cùng upsert validation, không còn RPC sao chép có thể bỏ qua policy chuyến mới.
- [x] `scripts/02_verify_rls.sql` kiểm anon/user A/user B/admin, owner isolation, malformed privilege, atomic upsert và vòng đời share token; mọi fixture rollback.
- [x] Xóa fallback N+1 ở client itinerary.
- [ ] Chạy schema/RLS test trên Supabase staging thật: external gate.
- [ ] Sinh `database.generated.ts` từ staging và kết nối typed Supabase client: chỉ làm sau khi schema thật tồn tại để tránh một file “generated” giả.

### Gate C — auth và route boundary

- [x] Auth subscription ở root, cleanup listener và đồng bộ store rõ ràng.
- [x] Guard guest/user/editor/admin ở layout; RLS vẫn là quyền quyết định cuối.
- [x] Password recovery có callback/deep link/reset route và error mapping thân thiện.
- [x] Register lưu version/thời điểm chấp nhận; có Terms và Privacy screen.
- [x] Profile setup upload avatar thật, validate/refresh store.
- [x] Xóa tài khoản qua RPC xác nhận, không đưa service-role key vào app.
- [ ] Deep-link/email round trip trên staging/device: external gate.

### Gate D — itinerary cốt lõi

- [x] Local-date helper loại lỗi lệch ngày UTC; có test ranh giới timezone/lịch.
- [x] Weather request dùng đúng start/end date; ngoài forecast horizon không bịa dữ liệu.
- [x] Time editor truyền đúng place ID, kiểm format/duration/overlap/midnight và lưu override; validation đã tách/test.
- [x] Optimizer weights có hiệu lực trong pipeline; affordance giả/delay giả được bỏ.
- [x] Free/VIP/timeline/save dùng cùng pipeline km/phút theo ma trận của phương tiện; fallback được gắn nhãn ước tính.
- [x] Map create/detail chỉ vẽ geometry do router trả về, chống response cũ khi đổi ngày và fit đúng markers/route.
- [x] Create/edit dùng serializer/RPC atomic, giữ snapshot/thứ tự/thời lượng; optimistic concurrency bằng `expected_updated_at`. Clone đi qua planner, xóa ngày/thời tiết cũ và buộc chọn ngày mới trước khi lưu.
- [x] Reset draft, preload edit, map preview theo ngày, share/vote/revoke theo token.
- [x] UI/config/optimizer/modal/progress/weather/advice đã tách vào `src/features/itinerary`.
- [~] `app/(tabs)/create.tsx` vẫn giữ controller/render orchestration ba bước. Không tách tiếp thành ba component với hàng chục callback chỉ để giảm số dòng; đây là debt thấp, không phải blocker production.

### Gate E — các bề mặt đang có

- [x] Search: params reset đúng, draft filter apply/cancel, history theo user/guest, lưu khi submit/select, pagination và sort distance immutable.
- [x] Home/Map/Place/Support/Admin: loading/error/empty/retry cho các query chính.
- [x] Place report + admin resolve/dismiss có note/audit.
- [x] Review create/edit/helpful; admin hide/restore có lý do và audit, không direct-delete trái RLS.
- [x] Ticket reply+resolve atomic; cache invalidation đúng; user không reply ticket đã đóng.
- [x] AI single-flight, bounded history, timeout/network/auth separation, quota theo `Asia/Ho_Chi_Minh`, refund khi upstream lỗi.
- [x] Admin users/places/reports có search/filter/pagination; role/ban và moderation dùng guarded RPC/audit.
- [x] Guest bấm lưu địa điểm được điều hướng đăng nhập thay vì silent no-op.

Không thêm booking, social feed, notification, gamification hay dữ liệu giả vì sẽ làm MVP phình to. Catalog thật tùy chọn chỉ đủ để khởi tạo luồng khám phá/lập lịch.

### Gate F — release candidate

- [x] Frontend lint/typecheck/unit/static schema contract.
- [x] Backend Maven unit/security/controller tests.
- [x] CI security/config/package/bundle gates và release docs.
- [ ] Supabase staging role matrix và SQL runtime syntax.
- [ ] Android/iOS physical-device smoke/E2E.
- [ ] JWT staging, upstream failure và quota concurrency test.
- [ ] Maps restriction, production CORS, secret/signing store, monitoring, log redaction, backup/restore drill.
- [ ] EAS production artifact smoke rồi rollout.

### Gate G — UI hardening (12/08/2026)

- [x] Status bar được quyết định theo route: icon sáng trên hero tối; icon tối trên màn nền sáng.
- [x] Map chính có status-bar scrim sáng độc lập với màu/nội dung bản đồ; map modal ép icon tối và dùng safe area riêng.
- [x] Home/login/register/profile-setup/create/profile đặt nội dung hero dưới tai thỏ/camera cutout nhưng vẫn cho nền tràn mép.
- [x] Tab bar thường/admin và filter sheet cộng đúng bottom inset; FAB giữa không còn bị đẩy xuống ngoài vùng chạm.
- [x] Bỏ native header trùng với header tự vẽ ở AI chat, VIP và itinerary share; profile dùng một nested stack thống nhất.
- [x] Form recovery/reset, time edit, review/report tránh bàn phím và vẫn cuộn được trên màn nhỏ.
- [x] Loại animation tuyến chạy lặp không truyền đạt trạng thái và từng chồng lên nội dung hero.
- [x] Chỉ giữ motion chức năng (press/loading/step/typing), dùng một Reduce Motion provider và sửa progress track theo đúng 64% chiều rộng.
- [ ] Smoke trực quan trên thiết bị thật: iPhone có Dynamic Island/tai thỏ, Android có camera cutout và Android 15 edge-to-edge.

Gate UI đã qua lint, typecheck, 78 frontend test, 16 backend test, Expo dependency check và bundle export Android/iOS/web. Đây vẫn là kiểm tra mã/bundle; chưa thay thế device smoke.

### Gate H — routing theo mạng lưới đường (12/08/2026)

- [x] Bỏ mọi fallback Polyline nối waypoint trực tiếp; router lỗi/no-route/timeout chỉ hiện trạng thái không khả dụng.
- [x] Chống race: response của ngày cũ không thể ghi đè route ngày mới; map fit geometry thật hoặc marker, không fit một đường giả.
- [x] Tách cấu hình OSRM cho `car`, `motorbike`, `walk`, `bicycle` ở cả Expo và Spring Boot; production thiếu bất kỳ profile nào sẽ fail-fast.
- [x] `/table` yêu cầu đủ ma trận duration + distance hữu hạn; ma trận thiếu/null bị hạ thành `estimated`, không trộn road time với Haversine distance rồi báo “road”.
- [x] Backend bỏ chia cụm “rắn” theo kinh độ; tối ưu một ma trận toàn cục, rồi dùng dynamic programming chia đoạn liên tục theo tải `thời lượng tham quan + đường thực/ước tính + buffer` trước khi tối ưu từng ngày.
- [x] Backend giải exact open Hamiltonian path tới 8 điểm; lớn hơn dùng multi-start nearest-neighbor + evaluated 2-opt. Ngưỡng 12 cũ đã bỏ vì `12!` có thể gây nghẽn CPU production.
- [x] Client giải exact hàm chi phí có thời tiết/giờ mở cửa tới 8 điểm/ngày; lớn hơn dùng multi-start + 2-opt.
- [x] Free “sắp tuyến cơ bản” giữ phân ngày và tối ưu thứ tự; VIP được phân lại ngày phía server rồi tối ưu khung giờ/thời tiết phía client.
- [x] So sánh VIP trước/sau được tính cùng input/profile; chỉ bấm “Áp dụng” mới commit trạng thái tối ưu.
- [x] UI và API công khai `road/mixed/estimated/not_needed`; icon di chuyển theo đúng phương tiện.
- [x] Jest phủ route geometry, profile isolation, matrix invalid, preserved order và exact weighted order; Maven phủ status/objective/exact/split ngày.
- [ ] External gate: dựng bốn OSRM instance/dataset thật, smoke tuyến Đà Nẵng cho từng phương tiện, giám sát `/route` + `/table` và cập nhật OSM định kỳ.

Giới hạn được diễn đạt công khai: OSRM mặc định tối ưu **thời gian tuyến nhanh**, không phải khoảng cách hình học ngắn nhất và không có traffic thời gian thực. Lịch là open path giữa các địa điểm đã chọn, chưa gồm khách sạn/vị trí hiện tại. Nhiều ngày hoặc danh sách lớn là heuristic, vì vậy sản phẩm không cam kết “ngắn nhất tuyệt đối”.

### Gate I — planning policy và lỗi biên (12/08/2026)

- [x] Tạo policy duy nhất: tên 1–120 ký tự, ngày 1–10, người 1–30, địa điểm thật 1–40, thời lượng địa điểm 15–720 phút, override 5–720 phút.
- [x] Lịch mới mặc định 1 ngày nhưng ngày bắt đầu để trống; người dùng phải chủ động chọn ngày. UI và SQL chặn ngày quá khứ theo `Asia/Ho_Chi_Minh`; lịch cũ vẫn được xem/sửa theo lịch sử.
- [x] Zustand là nguồn sự thật duy nhất cho địa điểm/phong cách; add từ màn chi tiết cập nhật ngay màn tạo, chống trùng/nhấn nhanh, preload/reset dùng session id để không giữ state của lịch trước.
- [x] Bỏ lỗi `!user && !profile`; lưu lịch bắt buộc có auth user thật và mọi validation được chạy lại tại nút lưu/API boundary.
- [x] Scheduler không modulo qua 24 giờ. Điểm không vừa, sai ngày mở cửa, sai giờ mở cửa hoặc override xung đột được trả về `unscheduledPlaces`; UI nêu tên/lý do và khóa lưu.
- [x] Nhà hàng thật dùng `isMealVenue` nhưng `isMeal=false`, nên vẫn lưu `place_id`; chỉ slot nghỉ tổng hợp mới có `isMeal=true`.
- [x] Hỗ trợ giờ mở cửa qua đêm như `20:00–02:00` nhưng không cho lịch trình vượt khung sản phẩm `08:00–21:00`.
- [x] Bước chọn điểm hiển thị sức chứa ước tính và nút tăng ngày; phân trang máy chủ 40 bản ghi/trang, debounce tìm kiếm, loading/error/retry và hard limit 40.
- [x] Kết quả weather/VIP/AI gắn với signature ngày, số ngày, phương tiện, thứ tự, override và trọng số; thay input thì kết quả cũ không còn được coi là hợp lệ. Weather dùng centroid các điểm đã chọn thay vì tọa độ trung tâm cố định.
- [x] Clone mở planner với ngày trống, không tái dùng weather/advice/override cũ; edit/clone báo rõ khi địa điểm lịch sử đã bị gỡ thay vì âm thầm làm biến mất.
- [x] SQL kiểm 1–40 địa điểm thật duy nhất, ngày mới không ở quá khứ, slot trong 08:00–21:00, ngày/giờ mở cửa và style không trùng. Clone RPC cũ đã bỏ; mọi bản sao phải quay lại planner và đi qua `upsert_itinerary`.
- [x] Lỗi RPC được ánh xạ sang thông báo nghiệp vụ, không phơi chi tiết database lạ.
- [x] Admin duration dùng cùng giới hạn 720 phút; backend từ chối request null/tọa độ/thời lượng sai và exact threshold an toàn.

### Gate J — Profile và Cài đặt production (12/08/2026)

Mười lỗi Profile đã được sửa tuần tự trước khi thêm Cài đặt:

1. [x] `home_city` rỗng được chuẩn hóa thành `NULL`, không còn vi phạm constraint SQL.
2. [x] Tên/bio/nơi ở dùng một policy chung đúng giới hạn schema 80/500/120 ký tự; cả setup và edit có `maxLength` cùng thông báo nghiệp vụ.
3. [x] Thống kê phân biệt rõ đang tải, lỗi và số 0; có retry, không giả 0 khi request thất bại.
4. [x] Thống kê dùng `count exact + head`, không tải toàn bộ saved places/itineraries chỉ để đếm; mutation liên quan invalidate đúng count cache.
5. [x] Đã lưu, lịch sử và đánh giá dùng infinite pagination. Tab lịch sử lọc ở Supabase trước khi phân trang nên không bỏ sót bản ghi ở trang chưa tải.
6. [x] Ảnh đại diện có thể thay hoặc xóa; database chỉ đổi sang `NULL` trước, object cũ mới được dọn sau khi update thành công, object upload lỗi được rollback.
7. [x] Lỗi tải profile không xóa Supabase user hay hiển thị người đã đăng nhập thành “Khách”; có fallback identity, loading riêng, error banner và retry.
8. [x] Tên/version/build lấy từ native binary bằng `expo-application`; riêng Expo Go dùng project config để không hiển thị version của Expo Go. Không còn chuỗi `v1.0.0` ghi cứng trong Profile.
9. [x] Ngôn ngữ chưa đủ bản dịch không còn chiếm một mục giả; selector chỉ xuất hiện trong Cài đặt khi có từ hai ngôn ngữ được bật.
10. [x] Người đang VIP thấy “Quyền lợi VIP”, trạng thái/ngày hết hạn và không còn CTA đăng ký; người free thấy rõ đây chỉ là đăng ký thử nghiệm, không thanh toán.

Màn **Cài đặt** mới được giữ nhỏ và chỉ chứa hành vi có thật:

- [x] Email đăng nhập và trạng thái xác minh; gửi email đổi mật khẩu qua Supabase recovery/deep link hiện có.
- [x] Trạng thái quyền vị trí, request lại khi được phép hoặc mở app settings khi hệ điều hành yêu cầu; API đối chiếu tài liệu Expo v57 nhưng dependency vẫn ở SDK 54.
- [x] Reduce Motion chỉ phản ánh thiết lập hệ điều hành, không tạo toggle cục bộ giả.
- [x] Xóa lịch sử tìm kiếm đúng namespace user/guest trên thiết bị; Search đọc lại khi tab focus.
- [x] Điều khoản, quyền riêng tư, hỗ trợ, xóa tài khoản, đăng xuất và app version/build động.
- [x] Gear trên header Profile mở Cài đặt; “Chỉnh sửa hồ sơ” còn một điểm vào rõ ràng trong danh sách tài khoản.
- [x] Không thêm notification, dark mode, offline map, map provider hay subscription toggle khi chưa có hạ tầng thật.
- [ ] External gate: smoke email recovery, permission transition và layout Settings/Profile trên iOS tai thỏ/Dynamic Island cùng Android edge-to-edge.

## 4. Kiến trúc sau chỉnh sửa

```text
app/                         routes/layouts + screen orchestration
src/
  components/               UI dùng chung
  constants/                theme/taxonomy/config
  features/
    admin/ ai/ auth/         API và logic theo miền
    itinerary/ places/       component + service + API
    legal/ location/
    profile/ support/ vip/
  services/                 Supabase/weather adapter
  stores/                   session và itinerary draft
  types/                    domain canonical
backend/                     Spring Boot trust boundary cho AI/quota/routing
scripts/                     clean schema + staging RLS verification
__tests__/                   unit/static contract
```

Ranh giới hệ thống được giữ nhỏ: PostgREST + RLS cho CRUD thông thường; RPC cho transaction/quyền đặc biệt; Spring Boot cho secret/quota/AI. Không chuyển toàn bộ CRUD sang backend vì không tạo thêm lợi ích bảo mật nếu RLS đã đúng.

Debt kiến trúc còn lại:

1. Một số facade cũ trong `src/hooks` còn tồn tại để tránh phá import hàng loạt.
2. `create.tsx` và vài admin route còn lớn; chỉ tách tiếp cùng thay đổi nghiệp vụ có test.
3. Supabase client chưa typed-generated vì chưa có database staging nguồn sự thật.

## 5. Bảo mật và SQL đã chốt

- Mobile không tin cậy; role/VIP/user ID/counter/publication state được xác minh ở DB/backend.
- Mỗi `SECURITY DEFINER` có fixed `search_path`, revoke `PUBLIC/anon` và grant allowlist.
- Owner isolation cho profile/itinerary/saved/helpful/ticket; banned account bị chặn mutation quan trọng.
- Admin access guard cấm tự khóa, bảo vệ admin cuối cùng và ghi audit.
- Review aggregates/helpful count là trigger-managed; admin moderation không xóa evidence.
- Place publication/revision/report resolution ghi audit; editor không quản lý media public.
- Itinerary payload kiểm ngày, số ngày, transport, 1–40 place duy nhất active/published, slot trong 08:00–21:00, ngày/giờ mở cửa, duration/order/snapshot size và rollback toàn bộ khi lỗi.
- Share RPC không trả `user_id`, `share_token` hay internal row; token hết hạn/revoke không đọc/vote được.
- Support reply+resolve và account deletion là transaction phía database.
- Backend không tin entitlement client; quota charge/refund và business date ở server.

SQL mới chưa được parser/runtime-check trên Supabase vì workspace không có Supabase CLI/Docker/project credential. Đây là lý do staging gate không được đánh dấu hoàn thành dù static contract đã xanh.

## 6. Interface/chức năng đã hoàn thiện

| Khu vực | Kết quả |
|---|---|
| Auth | Recovery/reset, error mapping, legal links/version, avatar, account deletion |
| Profile & Settings | Validation theo SQL, count nhẹ, pagination, avatar removal, profile retry, VIP state, account security, permissions, local data, dynamic build info |
| Search/Home/Map | Pagination/filter/history/location sort, retry/empty/loading |
| Place | Review edit, helpful toggle, report modal, author snapshot, retry |
| Itinerary | Create/edit/clone, exact dates/weather, time edit, route theo từng phương tiện, map day, share/vote/revoke |
| AI | Real backend only, bounded context/history, single-flight, auth/network/timeout handling |
| Support | Ticket list/detail/reply; admin atomic resolution |
| Admin | Paginated users/places/reports, audited access/moderation, review hide/restore |

Không có thanh toán giả, mock location/place, fake rating, hardcoded itinerary hay fallback Unsplash.

## 7. Kết quả kiểm tra repository

Kết quả vòng xác minh gần nhất:

- `npm run typecheck`: đạt.
- `npm run lint`: đạt sau khi dọn warning cuối.
- `npm run test:ci`: 16 suite, 78/78 test đạt.
- Backend `mvnw test`: 16/16 test đạt.
- `expo-doctor`: 18/18 check đạt.
- `expo install --check`: dependency up to date.
- Production `expo config --type public` và `expo export --platform all` cho Android/iOS/web: đạt.
- `npm audit`: 0 critical, 11 high, 9 moderate (20 tổng); fix do npm đề xuất là nâng major lên SDK 57 nên chưa áp dụng trong luồng Expo Go SDK 54.

Test đã phủ local date, planning policy/store session/giới hạn 40 điểm, weather range/horizon, route overflow/overnight/nhà hàng thật, geometry/profile/matrix, slot conflict, error mapping, recommender, availability, image validation, VIP entitlement, support contract, project integrity và SQL static contract. `02_verify_rls.sql` là integration test thật nhưng vẫn cần chạy trên Supabase staging.

## 8. Trình tự còn lại để phát hành production

1. Điền các biến `EXPO_PUBLIC_*` canonical, gồm bốn OSRM profile; không dùng fallback legacy/public demo cho production.
2. Cài `01_schema.sql` trên Supabase staging sạch; chạy `02_verify_rls.sql` và lưu log; sau đó tùy chọn nạp `03_seed_real_places.sql`.
3. Sinh type Supabase từ staging, typed client, chạy lại toàn bộ CI.
4. Deploy backend HTTPS một replica; test JWT/quota/upstream với staging.
5. Smoke đầy đủ trên Android/iOS development/preview build, gồm status bar map và routing bốn phương tiện.
6. Khóa Maps key, CORS, signing/secret, monitoring và backup/restore.
7. EAS production build, smoke đúng artifact, rollout có giám sát.

Chỉ sau bảy bước này mới đổi kết luận trong `RELEASE_READINESS.md` thành production-ready.
