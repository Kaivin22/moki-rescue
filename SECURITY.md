# Bảo mật dự án

## Mô hình tin cậy

- Mobile là client không tin cậy. Supabase anon key và Google Maps key xuất hiện trong binary; an toàn đến từ RLS, RPC allowlist và restriction của Google Cloud.
- Gemini key, PostgreSQL credential và mọi service-role key chỉ ở backend/secret manager.
- Spring Boot xác minh Supabase JWT/JWKS, trạng thái khóa, entitlement và quota. Client không được tự khai báo VIP.
- SQL dùng explicit grant, RLS và RPC atomic/audited cho chia sẻ, admin, hỗ trợ và xóa tài khoản.

## Secret và cấu hình

- Không commit `.env`, keystore, private key hay database password.
- Giới hạn Maps key theo Android package + signing SHA và iOS bundle ID; đặt quota.
- Production dùng HTTPS; PostgreSQL dùng TLS (`sslmode=require`); CORS là allowlist origin cụ thể.
- Nếu secret từng xuất hiện trong commit/log, phải thu hồi và rotate. Xóa ở commit mới không xóa được lịch sử.
- Keystore hiện được ignore nhưng vẫn nằm trong workspace; chuyển bản phát hành sang EAS Credentials/secret store và không chia sẻ file này.

## Kiểm tra trước merge

```powershell
npm ci
npm run check
npm audit --audit-level=critical
cd backend
.\mvnw.cmd test
```

Không chạy `npm audit fix --force`: nó có thể nâng major/Expo SDK ngoài compatibility matrix. Các advisory không critical của SDK 54 phải được theo dõi và đánh giá lại khi chuyển sang development build/SDK mới.

## Database và dữ liệu cá nhân

- `00_reset.sql` chỉ dùng local/staging và bắt buộc cờ xác nhận trong cùng SQL session.
- Chạy `02_verify_rls.sql` trên staging sau khi cài schema. Static test không thay thế PostgreSQL thật.
- AI chat, avatar, review và ticket là dữ liệu người dùng. Privacy Policy mô tả phạm vi lưu; account deletion xóa dữ liệu theo FK/RPC.
- Bucket avatar/place image là public theo quyết định sản phẩm; URL đã biết có thể đọc. Chỉ admin quản lý media công khai. Nếu sau này cho editor tải ảnh revision chưa duyệt, phải dùng bucket private/signed URL trước khi mở tính năng.
- Backend rate limiter hiện phù hợp một instance. Trước khi scale nhiều replica phải dùng shared store như Redis và kiểm thử quota concurrency.

## Vận hành production

- Bật branch protection và bắt buộc các job `backend-test`, `security`, `typecheck`, `test`.
- Dùng GitHub Environment/EAS credentials có reviewer cho release.
- Cấu hình log redaction; không log JWT, prompt AI đầy đủ, password hoặc database URL có credential.
- Có backup/restore drill trước migration production và monitoring cho lỗi mobile/backend/upstream.
