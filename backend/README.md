# Spring Boot API

Spring Boot là lớp bảo mật và tính toán tin cậy của ứng dụng, không nhân đôi CRUD đã được Supabase + RLS xử lý.

## Trách nhiệm

- Xác minh access token Supabase bằng JWKS và yêu cầu đăng nhập cho mọi API.
- Đọc trạng thái VIP/hạn dùng từ `profiles`; client không được tự cấp quyền.
- Giới hạn tần suất và hạn mức AI theo người dùng.
- Gọi Gemini mà không làm lộ API key trên ứng dụng.
- Phân ngày, sắp thứ tự tuyến VIP trên server; dùng đúng OSRM instance của ô tô/xe máy/đi bộ/xe đạp và fallback ước tính có khai báo khi dịch vụ ngoài lỗi.
- Chuẩn hóa lỗi API; không trả lỗi dưới dạng HTTP 200.

## API

- `POST /api/ai/chat`: chat có hạn mức ngày.
- `POST /api/ai/optimize`: chỉ VIP; tối ưu các địa điểm theo số ngày và phương tiện.
- `POST /api/ai/optimize-review`: chỉ VIP; Gemini nhận xét phương án đã tối ưu.

## Cấu hình và chạy

Sao chép biến tương ứng trong `.env.example`. Supabase phải dùng asymmetric signing key để Spring xác minh qua JWKS; không đưa service-role key vào ứng dụng.

```powershell
cd backend
.\mvnw.cmd test
.\mvnw.cmd spring-boot:run
```

Mỗi `OSRM_*_BASE_URL` phải là base URL của một instance được preprocess bằng profile tương ứng; tham số `driving` trong URL request không đổi profile của dataset. Không dùng `router.project-osrm.org` cho production. Response trả `routingStatus`, `objective` và `exactOrder`; fallback Haversine chỉ là ước tính có nhãn, không được dùng để vẽ tuyến trên bản đồ.

Mục tiêu routing là giảm **thời gian của tuyến nhanh nhất** do OSRM trả về, không tuyên bố là khoảng cách hình học ngắn nhất hoặc có giao thông thời gian thực. Tối đa 8 điểm có thứ tự exact theo ma trận hiện có; danh sách lớn dùng multi-start + 2-opt. Nhiều ngày được chia bằng dynamic programming theo thời lượng tham quan, thời gian đường và buffer. Đây là open path giữa các địa điểm đã chọn, chưa bao gồm điểm xuất phát như khách sạn/vị trí hiện tại.

Rate limiter hiện lưu trong bộ nhớ, phù hợp một instance. Nếu scale nhiều instance, thay bằng Redis/token bucket dùng chung.
